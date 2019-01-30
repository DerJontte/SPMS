/* Overlay that grays out the screen and shows an animated gear when the application is busy. */

import React, { Component } from "react";
import styled from "styled-components";
import { ReactComponent as Gear } from './BusyGear.svg';

export default class BusyOverlay extends Component {

    static set() {
        this.overlay = document.getElementById("busyOverlay")
        this.overlay.style.visibility = "visible";
    }

    static unset() {
        this.overlay.style.visibility = "hidden";
    }

    render() {
        const Overlay = styled.div`
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            margin: 0;
            background: rgba(0, 0, 0, 0.3);
            z-index: 1;
            visibility: hidden;
        `;

        const BusyDialog = styled.div`
            position: absolute;
            text-align: center;
            background-color: rgba(222, 222, 160, 1);
            width: auto;
            height: auto;
            padding: 2em;
            padding-bottom: 1em;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            border-radius: 10px;
            border: 3px dashed black;
            color: black;
        `;

        const Spin = styled.div`
            display: inline-block;
            width: 50%;
            animation: spin 5s infinite linear;
            @keyframes spin {
            from {
                transform:rotate(0deg);
            }
            to {
                transform:rotate(360deg);
            }`;

        return (
            <Overlay id="busyOverlay">
                <BusyDialog>
                    Loading, please wait...
                    <div>
                        <Spin>
                            <Gear/>
                        </Spin>
                    </div>
                </BusyDialog>
            </Overlay>
        )
    }
}