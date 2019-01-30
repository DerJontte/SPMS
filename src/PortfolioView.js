/* This file is responsible for rendering the section with the portfolios. */

import React, {Component} from "react";
import styled from "styled-components";
import StockEntry from "./StockEntry";
import Currency from "./Currency";
import StockServerData from "./StockServerData";
import PerformanceGraph from "./PerformanceGraph";
import BusyOverlay from "./BusyOverlay";

export default class PortfolioView extends Component {
    /* The main class for the PortfolioView-component. */

    constructor(props){
        super(props);
        // The portfolios and a pointer to the method that saves the global state are passed down as props.
        this.saveState = props.saveState;
        this.portfolios = props.portfolios;
    }

    async addStock(portfolio) {
        /* Method to add new stocks to a portfolio or add shares to existing stocks. */
        let stockFound = false;
        let value, amount;

        if (portfolio.entries.length >= 50) {
            // The maximum number of stock symbols in a portolio is 50. If the limit has been reached, alert the user
            // and return to caller.
            var addExisting = window.confirm("The maximum number of stocks in the current portfolio has been reached. Do you wish to add shares to an existing stock?");
            if (addExisting === false) return;
        }

        let symbol = prompt("Please enter stock symbol");
        if (!symbol) return;
        symbol = symbol.toUpperCase();

        // If the stock symbol already exists, add the new shares to that existing entry.
        for (let i = 0; i < portfolio.entries.length; i++) {
            if (portfolio.entries[i].symbol === symbol) {
                stockFound = true;
                var existingIndex = i;
                break;
            }
        }

        if (addExisting && !stockFound) {
            alert("The entered symbol does not exist in portfolio.");
            return;
        }

        // If the symbol exists in the local storage, get the share value from there, otherwise prompt the user for a
        // value or to fetch the value from AlphaVantage.
        let doConvert = true;
        if (symbol in localStorage) {
            doConvert = false;
            value = JSON.parse(localStorage.getItem(symbol))["value"];
        }

        while (!value || isNaN(value)) {
            value = prompt("Please enter value per share in " + portfolio.currency + ".\nLeave blank to fetch the current value from AlphaVantage.");
            if (value === null) return;
            if (value < 0) value = ".";
            if (value === '') {
                BusyOverlay.set();
                let response = await StockServerData.getCurrentStockValue(this, symbol);
                BusyOverlay.unset();
                if (response === 200) {
                    value = JSON.parse(localStorage.getItem(symbol))["value"];
                } else {
                    // If something went wrong, tell the user and present them with the earlier options again.
                    localStorage.removeItem(symbol);
                    alert("Could not fetch stock value from server. Please try again or enter value manually.");
                    value = ".";
                }
            }
        }

        // Ask for the number of shares. If the portfolio currency is in EUR (and the share value thus entered in EUR),
        // convert the value to USD before storing it.
        while (!amount || isNaN(amount) || amount % 1 !== 0 || amount < 0) {
            amount = prompt("Please enter the number of shares to add.");
            if (amount === null) return;
        }
        if (portfolio.currency === "EUR" && doConvert) value = Currency.EtoD(value);

        if (stockFound) {
            portfolio.addStock(new StockEntry(symbol, value, amount), existingIndex);
        } else {
            portfolio.addStock(new StockEntry(symbol, value, amount));
        }
        this.saveState();
    }

    removeStock(portfolio) {
        // Method to invoke removal of shares from a stock entry.
        let amount = prompt("Amount to remove");
        portfolio.removeStock(portfolio.selected, amount);
        this.saveState();
    }

    deletePortfolio(removeID) {
        // Method that is invoked when the close-button of a portfolio is pressed. The portfolio ID is a running number
        // that doesn't neccesarily match the portfolio's index in the array with portfolios, so the array must be looped
        // through to find the correct one.
        for (let i = 0; i < this.portfolios.length; i++) {
            if (this.portfolios[i] === (undefined || null)) continue;
            if (this.portfolios[i].id === removeID) {
                if (window.confirm("Do you want to delete the portfolio " + this.portfolios[i].name + "?")) {
                    this.portfolios.splice(i, 1);
                }
            }
        }
        this.saveState();
    }

    async createGraph(portfolio) {
        // Initiate the generation and showing of a performance graph for a selected stock.
        if (portfolio.selected === '') return;
        let symbol = portfolio.entries[portfolio.selected].symbol;
        PerformanceGraph.createChartWindow(this, symbol);
    }

    render() {
        const PortfolioContainer = styled.div`
            float: left;
            display: flex;
            flex-direction: column;
            width: calc(50vw - 50px);
            min-width: 200px;
            max-width: 650px;
            border: 1px solid black;
            margin: 0 15px 20px;
            :only-child {
                width: calc(100vW - 50px);
            }
            @media screen and (max-width: 1024px) {
                width: calc(100vw - 50px);
            }
        `;

        const PortfolioSection = styled.div`
            display: flex;
            flex-wrap: wrap;
            width: calc(100vw - 40px);
            float: left;
            justify-content: center;
            @media screen and (max-width: 1024px) {
                flex-wrap: wrap;
            }
            `;

        let portfolioArray = [];

        // Loop through the list of portfolios and create an array with rendered visualisations of them
        for(let i = 0; i < this.portfolios.length; i++) {
            if (this.portfolios[i] === (undefined || null)) continue;

            let currentPortfolio = this.portfolios[i];
            let deletePortfolio = this.deletePortfolio.bind(this, currentPortfolio.id);
            let uniqueID = "id" + currentPortfolio.id;

            // Each portfolio component consists of a TitleBar, a stock list and a BottomBar.
            portfolioArray.push(
                <PortfolioContainer key={i.toString()}>
                    <TitleBar currentPortfolio={currentPortfolio} uniqueID={uniqueID} deletePortfolio={deletePortfolio} saveState={this.saveState} />
                    <StockList portfolio={currentPortfolio} self={this} />
                    <BottomBar currentPortfolio={currentPortfolio} addStock={this.addStock.bind(this, currentPortfolio)} removeStock={this.removeStock.bind(this, currentPortfolio)} createGraph={this.createGraph.bind(this, currentPortfolio)}/>
                </PortfolioContainer>
            )
        }

        return (
            <PortfolioSection>
                {portfolioArray}
            </PortfolioSection>
        )
    }
}


class TitleBar extends Component{
    // The title bar for the portfolio. Contains the name of the portfolio, a switch for switching between currencies,
    // and a button to close (ie. delete) the portfolio.
    render() {
        const TitleBarContainer = styled.div`
            background-color: #DDA;
            display: flex;
            min-height: 40px;
            align-items: center;
            padding: 10px;
            border-bottom: 1px solid black;
            text-align: center;        
            @media screen and (max-width: 266px) {
                    font-size: 10px;
            }
            @media screen and (max-height: 425px) {
                    min-height: 46px;
            }
            `;

        const Title = styled.div`
            display: flex;
            justify-content: flex-end;
            flex-grow: 3.5;
        `;

        // The close-button is a normal button styled in CSS to mimic the classic windows close-button.
        const CloseButton = styled.div`
            background-color: darkred;
            color: white;
            font-family: Corbel, monospace;
            font-weight: bold;
            width: 1.4em;
            height: 1.3em;
            border-bottom: 1px solid darkred;
            cursor: default;
            margin-left: 5px;
            :hover {
                background-color: firebrick;
            }
        `;

        var currentPortfolio = this.props.currentPortfolio;

        return (
            <TitleBarContainer>
                <Title>
                    {currentPortfolio.name}
                </Title>
                <Switch labelOff="EUR" labelOn="USD" onChange={currentPortfolio.changeCurrency.bind(currentPortfolio)} saveState={this.props.saveState} on={currentPortfolio.currency === "EUR"}/>
                <CloseButton id={"button" + this.props.uniqueID } onClick={this.props.deletePortfolio}>
                    x
                </CloseButton>
            </TitleBarContainer>
        )
    }
}

class StockList extends Component {
    // Create a table with a list of the stocks in a given portfolio. The table is returned as a DOM-element to the caller.
    render() {
        const Table = styled.table`
            display: block;
            text-align: center;
        `;

        const TableHeader = styled.thead`
            display: block;
        `;

        const HeaderRow = styled.tr`
            display: flex;
            background-color: #CCC;
            min-height: 1.8em;
            font-weight: normal;
            border-bottom: 1px solid black;
        `;

        const TableBody = styled.tbody`
            display: flex;
            flex-direction: column;
            overflow: auto;
            width: 100%;
            height: -webkit-fill-available;
            max-height: 261px;
            background: linear-gradient(
                    to bottom,
                    rgba(220, 220, 220, 0.3),
                    rgba(240, 240, 240, 0.1) 80%,
                    rgba(200, 200, 200, 0.3) 50%,
                    rgba(220, 220, 220, 0.3) 50%
            );
            background-size: 1% 5px;        
            @media screen and (max-height: 425px) {
                max-height: calc(100vh - 164px);
            }
            @media screen and (max-height: 232px) {
                max-height: 68px;
            }
        `;

        const TableRow = styled.tr`
            display: block;
            background-color: #CCC;
            :nth-child(even) {
                display: block;
                background-color: #AAA;
            }
        `;

        const Cell = styled.td`
            width: 20%;
            float: left;
            padding: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 4px;
        `;

        let portfolio = this.props.portfolio;
        let stockList = portfolio.entries;
        let tableBodyData = [];
        var self = this.props.self;

        // The list itself is created here as a html table-body styled with alternating colored rows
        for(let i = 0; i < stockList.length; i++) {
            if(stockList[i] == null) continue;

            let unitValue = portfolio.getCurrentValue(stockList[i]);
            let totalValue = portfolio.getCurrentRate(stockList[i].totalValue);

            let setSelected = function (i) {
                portfolio.selected = i;
                self.saveState();
            }

            tableBodyData.push(
                <TableRow onClick={setSelected.bind(self, i)} key={i.toString()}>
                    <Cell>{stockList[i].symbol}</Cell>
                    <Cell>{unitValue} {portfolio.currency}</Cell>
                    <Cell>{stockList[i].amount}</Cell>
                    <Cell>{totalValue} {portfolio.currency}</Cell>
                    <Cell><input type="radio" name={"selection" + portfolio.id} checked={portfolio.selected === i} readOnly={true}/></Cell>
                </TableRow>
            )
        }

        // The table body created above is then inserted in a table with a non-scrolling header with the field names
        return (
            <Table>
                <TableHeader>
                    <HeaderRow>
                        <Cell>Name</Cell>
                        <Cell>Unit value</Cell>
                        <Cell>Quantity</Cell>
                        <Cell>Total value</Cell>
                        <Cell>Select</Cell>
                    </HeaderRow>
                </TableHeader>
                <TableBody>
                    {tableBodyData}
                </TableBody>
            </Table>
        )
    }
}

class BottomBar extends Component {
    // The bottom bar contains the total value of the portfolio and buttons to manipulate and visualize the contents
    // of the portfolio.

    render() {
        let currentPortfolio = this.props.currentPortfolio;

        const BottomBar = styled.div`
            height: auto;
            max-width: 648;
            min-width: 198;
            border-top: 1px solid black;
            background-color: #DDA;
            padding: 8px 5px 15px 15px;
            @media screen and (max-width: 1024px) {
                display: table-cell;
                height: auto;
            }
            @media screen and (max-width: 446px) {
                    padding: 2px 5px 6px 5px;
            }
            @media screen and (max-width: 379px) {
                padding-bottom: 4px;
            }
        `;

        // CuttingText is used to let the text be cut off and replaced with "..." at the edge, so that the layout of
        // the app doesn't break even att the narrowest widths.
        const CuttingText = styled.div`
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;

        const LeftHalf = styled.div`
            float: left;
            width: 60%;
            @media screen and (max-width: 446px) {
                display: flex;
                justify-content: space-between;
                width: 60%;
            }
        `;

        const RightHalf = styled.div`
            float: left;
            width: 40%;
            @media screen and (max-width: 446px) {
                display: flex;
                justify-content: flex-end;
                width: 40%;
            }
        `;

        const Button = styled.button`
            min-width: 46px;
            margin-top: 5px;
            ${props => props.FloatRight ? "float: right" : null}
            @media screen and (max-width: 446px) {
                float: none;
                margin-top: 2px;
                margin-right: 0;
                margin-left: 0px;
            }
        `;

        return(
            <BottomBar>
                <CuttingText>
                    Total value of portfolio : {currentPortfolio.getCurrentRate(currentPortfolio.value)} {currentPortfolio.currency}
                </CuttingText>
                <LeftHalf>
                    <Button onClick={this.props.addStock}>Add stock</Button>
                    <Button onClick={this.props.createGraph}>Performance graph</Button>
                </LeftHalf>
                <RightHalf>
                    <Button FloatRight onClick={this.props.removeStock}>Remove selected</Button>
                </RightHalf>
            </BottomBar>
        )
    }
}

class Switch extends Component {
    /*  A switch that flips when clicked. Basically just a normal button that is styled to look like an oval switch. The
     * state of the switch is displayed with different colored borders that take up approximately half of the switch on each
     * side.
     *
     * This file contains all styling and logic that is needed for the switch itself, and thus the component is easily
     * reused.
     *
     * The component takes the following props:
     * - labelOff: label displayed for the off-state of the switch.
     * - labelOn: label displayed for the on-state of the switch.
     * - onChange: action to take when the switch id flipped (ie. the button is pressed).
     * - on: boolean value that is passed to the constructor to set the initial state of the switch
     *
     * - saveState: the saveState of the app root which forces update of the DOM. Specific for this project, can be
     * removed when the switch is used in other projects.
     */

    constructor(props) {
        super(props);
        this.state = {
            on: this.props.on,
        }
    }

    flip() {
        this.setState({on: !this.state.on});
        this.props.onChange();
        this.props.saveState();
    }

    render() {
        let rot = 180 * this.state.on;

        const SwitchContainer = styled.div`
            display: flex;
            flex-direction: row;
            justify-content: flex-end;
            align-items: center;
            flex-grow: 2;
        `;

        const Switch = styled.button`
            height: 15px;
            width: 30px;
            border: 0;
            padding: 0;
            margin: 5px;
            border-right: 15px solid darkred;
            outline: none;
            border-radius: 10px;
            background-color: #BBB;
            transform: rotate(${rot}deg);
             :hover {
                border-color: firebrick;
            }
       `;
        return (
            <SwitchContainer>
                {this.props.labelOff}
                <Switch onClick={this.flip.bind(this)}/>
                {this.props.labelOn}
            </SwitchContainer>
        );
    }
}