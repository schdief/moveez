import React from "react";
import ReactDOM from "react-dom";

import sBackgroundImageUrl from "./welcome_background.png";


const Background = ()=>{
    return (
        <div style={{
            width: "100%", 
            height:"500px", 
            backgroundImage:`url(${sBackgroundImageUrl})`, 
            backgroundSize:"cover",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column"}}>
            <BingeText/>
            <SignupButton/>
        </div>
    );
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
        <button className="ui button"onClick={fnOnClick}>Enter Moveez</button>
    );
};

ReactDOM.render(
    <Background/>,
    document.getElementById('reactRoot')
)
