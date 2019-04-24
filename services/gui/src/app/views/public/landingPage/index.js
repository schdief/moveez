import React from "react";
import ReactDOM from "react-dom";

import sBackgroundImageUrl from "./top250.png";
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
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            flexDirection: "column"}}>
            <MoveezIcon/>
            <BingeText/>
            <SignupButton/>
            <GDPR/>
        </div>
    );
};

const ContentBox = ()=>{
    return (
        <div style={{
            padding: "1rem",
            backgroundColor: "rgba(27,27,27,0.85)",
            borderRadius: "1rem",
            display: "inline-block"}}>
            <Content/>
        </div>
    );
};

const FlexFix = ()=>{
    return (
        <div style={{
            width: "100%", 
            height:"100%", 
            display: "flex",
            alignItems: "stretch",
            flexDirection: "column"}}>
            <div style={{
                flexGrow: 1,
                display: "flex",
                justifyContent: "center",
                alignItems: "center"}}>
                <ContentBox/>
            </div>
            <div>
                <MoveezFooter/>
            </div>
        </div>
    );
};

const MoveezFooter = () => {
    return (
        <div style={{
        color:"white", 
        backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,1))",
        paddingTop: "2rem"}}>
            <div>Logo made by <a href="http://www.freepik.com" title="Freepik">Freepik</a> from <a href="https://www.flaticon.com/" title="Flaticon">www.flaticon.com</a> is licensed by <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a></div>
            <div>Thanks to <a href="https://www.emojione.com/">EmojiOne</a> for providing free emoji icons.</div>
        </div>
    );
};

const MoveezIcon = () => {
    return (
        <img src={sLogoUrl} style={{height:"10rem"}}/>
    )
};

const BingeText = ()=>{
    return (
        <p style={{
            fontSize: "4rem",
            color: "white",
            marginBottom: "20px"
        }}>manage your binge!</p>
    );
};

const SignupButton = ()=>{
    const fnOnClick = ()=>{
        open("/auth/facebook", "_self");
    };
    return (
        <button id="enter" className="ui labeled icon facebook button" onClick={fnOnClick}>Login <i class="facebook icon"></i></button>
    );
};

const GDPR = ()=>{
    return (
        <p style={{
            color: "white",
            marginTop: "20px"
        }}>You consent to our <a id="gdpr" href="/impressum">data privacy statement</a> by logging in.</p>
    );
};

ReactDOM.render(
    <LandingPage/>,
    document.getElementById('reactRoot')
)
