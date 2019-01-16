import React from "react";
import ReactDOM from "react-dom";

import sBackgroundImageUrl from "./welcome_background.png";
import sLogoUrl from "../logo.png";


const LandingPage = ()=>{
    return (
        <div style={{
            fontFamily:"Lato",
            width: "100%", 
            height:"100%", 
            backgroundImage:`url(${sBackgroundImageUrl})`, 
            backgroundSize:"cover"}}>
            <FlexFix/>
        </div>
    );
};

const Content = ()=>{
    return (
        <div style={{
            width: "100%", 
            height:"100%", 
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column"}}>
            <MoveezIcon/>
            <BingeText/>
            <SignupButton/>
        </div>
    );
};

const FlexFix = ()=>{
    return (
        <div style={{
            width: "100%", 
            height:"100%", 
            display: "flex",
            flexDirection: "column"}}>
            <div style={{flexGrow: 1}}>
                <Content/>
            </div>
            <div>
                <MoveezFooter/>
            </div>
        </div>
    );
};

const MoveezFooter = () => {
    return (
        <div style={{color:"white"}}>
            <div>Logo made by <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
            <div>Thanks to <a href="https://www.emojione.com/">EmojiOne</a> for providing free emoji icons.</div>
        </div>
    );
};

const MoveezIcon = () => {
    return (
        <img src={sLogoUrl}/>
    )
};

const BingeText = ()=>{
    return (
        <p style={{
            fontSize: "5rem",
            color: "lightgrey"
        }}>manage your binge</p>
    );
};

const SignupButton = ()=>{
    const fnOnClick = ()=>{
        open("/title", "_self");
    };
    return (
        <button className="ui button teal"onClick={fnOnClick}>Enter Moveez</button>
    );
};

ReactDOM.render(
    <LandingPage/>,
    document.getElementById('reactRoot')
)
