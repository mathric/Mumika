const fs = require('fs');
const path = require('path');
const { ipcRenderer, remote } = require("electron");
const { dialog } = remote;

const itemNumOnePage = 15;

class UserConfig {
    constructor() {
        this.searchPropList = [];
        this.propVisibility = [];
        this.tags = [];
        this.objectTemplate = null;
        this.sortList = [];
    }
}

let dataPath = "";
let itemList = [];
let filteredItemList = [];
let currentPageItemList = [];
let searchPropList = [];
let propVisibility = {};
let tags = {};
let objectTemplate = null;

const userConfigPath = getUserConfigPath();
let userConfig = new UserConfig();
initModel();
export { userConfig, dataPath };

//register the event listener for custom setting storage
ipcRenderer.on("custom setting storage", (event, args) => customSearchEventHandler(args));

function readUserConfig() {
    try {
        if (fs.existsSync(path.resolve(__dirname, userConfigPath))) {
            //file exists
            let rawdata = fs.readFileSync(path.resolve(__dirname, userConfigPath));
            let userConfigObj = JSON.parse(rawdata);
            dataPath = userConfigObj["dataURL"];
            userConfig.propVisibility = userConfigObj["visible"]; // false means optional property
            userConfig.tags = userConfigObj["tag"];
            userConfig.searchPropList = userConfigObj["searchProperty"];
            userConfig.sortList = userConfigObj["sortList"]
        }
        else {
            //userconfig not exist
        }
    } catch (err) {
        console.error(err)
    }
}

function readData() {
    try {
        if (fs.existsSync(dataPath)) {
            //file exists
            let rawdata = fs.readFileSync(path.resolve(__dirname, dataPath));
            itemList = JSON.parse(rawdata)["itemList"];
        }
        else {
            //user data.json not exist
        }
    } catch (err) {
        console.error(err)
    }
}

function getUserConfigPath() {
    if ("userConfigPath" in localStorage) {
        return localStorage.getItem("userConfigPath");
    }
    return "config.json";
}

function initModel() {

    //check first load or not
    if (sessionStorage.getItem("firstTimeLoaded") === null || sessionStorage.getItem("firstTimeLoaded") == "true") {
        readUserConfig();
        readData();
        filteredItemList = [...itemList];

        window.sessionStorage.setItem("currentPage", "0");
        sessionStorage.setItem("firstTimeLoaded", "false");
        sessionStorage.setItem("itemList", JSON.stringify(itemList));
        sessionStorage.setItem("filteredItemList", JSON.stringify(filteredItemList));

        //set current page to 0
        setCurrentPageItems(0);

        //default sort is ascend
        sessionStorage.setItem("sortAsc", "true");
        sessionStorage.setItem("tagSearchOption", "contain-any-tag")

        //default sort prop is first item define in userconfig:searchProperty first item
        if (userConfig.sortList.length > 0) {
            sessionStorage.setItem("sortProperty", userConfig.sortList[0])
        }
        else {
            sessionStorage.setItem("sortProperty", " ");
        }

        //search result text
        sessionStorage.setItem("searchText", "");
    }
    else {
        readUserConfig();
        itemList = JSON.parse(sessionStorage.getItem("itemList"));
        filteredItemList = JSON.parse(sessionStorage.getItem("filteredItemList"));
        currentPageItemList = JSON.parse(sessionStorage.getItem("currentPageItemList"));
    }

    //custom setting object array
    if (localStorage.getItem("customSettingArray") === null) {
        localStorage.setItem("customSettingArray", JSON.stringify([]));
    }
}

function checkConfigChange(pathArg) {
    //first run without import anything before
    if (!("userConfigPath" in localStorage)) {
        return 0;
    }
    //change the config file
    if (localStorage.getItem("userConfigPath") != pathArg) {
        return 1;
    }
    return -1;
}

function customSearchEventHandler(signal) {
    if (signal[0] == "initPage") {
        sessionStorage.setItem("firstTimeLoaded", "true")
        document.getElementById("view-all-btn").click();
        return;
    }
    else if(signal[0] == "removeAll") {
        let deletOptions = {
            type: "warning",
            buttons: ["Yes", "No"],
            message: "Do you really want to delete all current settings(include auto load current config path and custom setting file)?"
        } 
        let response = dialog.showMessageBoxSync(deletOptions)
        if(response == 0) {
            //delete custom setting file
            try{
                if (fs.existsSync(path.dirname(userConfigPath) + "/CustomSetting.txt")) {
                    fs.unlinkSync(path.dirname(userConfigPath) + "/CustomSetting.txt");
                } 
            }
            catch(err) {
                console.error(err);
            }
            
            localStorage.clear();
            sessionStorage.clear();

            location.reload(); 
        }   
    }
    else if (checkConfigChange(signal[1]) > -1) {
        /*
            store current setting to file first, 
            local storage only stores custom setting and userConfigPath v1.0.0
        */
        if (checkConfigChange(signal[1]) == 1) {
            if (signal[0] == "write") {
                let currentCustomSettingArray = localStorage.getItem("customSettingArray");
                if (currentCustomSettingArray.length > 0) {
                    //write file
                    fs.writeFileSync(path.dirname(userConfigPath) + "/CustomSetting.txt", currentCustomSettingArray);
                }

            }
        }

        //reload different config file's custom setting and set the new config file path in local storage
        if (signal[0] == "reloadStorage") {
            localStorage.clear();
            if (fs.existsSync(path.dirname(signal[1]) + "/CustomSetting.txt")) {
                localStorage.setItem("customSettingArray", fs.readFileSync(path.dirname(signal[1]) + "/CustomSetting.txt"));
            }
            localStorage.setItem("userConfigPath", signal[1]);
        }
    }
}

//run the filter pass by the controller
export function runFilter(filterFunc) {
    try {
        filteredItemList = JSON.parse(sessionStorage.getItem("filteredItemList"));
        filterFunc(filteredItemList);
        sessionStorage.setItem("filteredItemList", JSON.stringify(filteredItemList));
        return true;
    }
    catch (err) {
        console.error(err);
        return false;
    }
}

//sort the item list with property
export function sortItemList(sortFunc) {
    try {
        filteredItemList = JSON.parse(sessionStorage.getItem("filteredItemList"));
        filteredItemList.sort(sortFunc)
        sessionStorage.setItem("filteredItemList", JSON.stringify(filteredItemList));
        return true;
    }
    catch (err) {
        console.error(err);
        return false;
    }
}

export function resetFilteredItemList() {
    if (sessionStorage.getItem("sortAsc") === "true") {
        filteredItemList = [...itemList];
    }
    else {
        filteredItemList = [...itemList].reverse();
    }
    sessionStorage.setItem("filteredItemList", JSON.stringify(filteredItemList));
}

export function setCurrentPageItems(pageNum) {
    filteredItemList = JSON.parse(sessionStorage.getItem("filteredItemList"));
    currentPageItemList = filteredItemList.slice(pageNum * itemNumOnePage, (pageNum + 1) * itemNumOnePage)
    sessionStorage.setItem("currentPageItemList", JSON.stringify(currentPageItemList));
}

export function getTotalPage() {
    filteredItemList = JSON.parse(sessionStorage.getItem("filteredItemList"));
    return Math.floor(filteredItemList.length / itemNumOnePage);
}




