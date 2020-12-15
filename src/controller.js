import { userConfig } from "./model.js"
import { resetFilteredItemList, setCurrentPageItems, runFilter, sortItemList } from "./model.js"

const { remote } = require('electron');
const { BrowserWindow, dialog } = remote;
const prompt = require('electron-prompt');
const maxCustomCondition = 3;

class Filter {
    static checkedTag = [];

    static doNothing(itemList) { }

    //randomize the item order(Fisher-Yates Shuffle)
    static randomizeFilter(itemList) {
        for (let i = itemList.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [itemList[i], itemList[j]] = [itemList[j], itemList[i]];
        }
    }

    static searchTextFilter(itemList) {
        for (let i = 0; i < itemList.length; i++) {
            let foundFlag = false;
            for (let prop of userConfig.searchPropList) {
                //some prop is optional
                if (itemList[i].hasOwnProperty(prop)) {    
                    if (itemList[i][prop].toLowerCase().indexOf(document.getElementById("search-text").value.toLowerCase()) > -1) {
                        foundFlag = true;
                    }
                }
            }
            if (!foundFlag) {
                itemList.splice(i, 1);
                i -= 1;
            }
        }
    }

    static containAnyTagFilter(itemList) {
        for (let i = 0; i < itemList.length; i++) {
            if (!Filter.checkedTag.some(element => itemList[i]["tag"].includes(element))) {
                itemList.splice(i, 1);
                i -= 1;
            }
        }
    }

    static containAllTagFilter(itemList) {
        for (let i = 0; i < itemList.length; i++) {
            if (!Filter.checkedTag.every(element => itemList[i]["tag"].includes(element))) {
                itemList.splice(i, 1);
                i -= 1;
            }
        }
    }
    //not containing any of the selected tag
    static excludeTagFilter(itemList) {
        for (let i = 0; i < itemList.length; i++) {
            if (Filter.checkedTag.some(element => itemList[i]["tag"].includes(element))) {
                itemList.splice(i, 1);
                i -= 1;
            }
        }
    }
}

class CompareItem {
    static compProp = null;
    static ascendComp(a, b) {
        if (a.hasOwnProperty(CompareItem.compProp) && b.hasOwnProperty(CompareItem.compProp)) {
            if (a[CompareItem.compProp] < b[CompareItem.compProp]) {
                return -1;
            }
            else if (a[CompareItem.compProp] > b[CompareItem.compProp]) {
                return 1;
            }
            return 0;
        }
    }

    static descendComp(a, b) {
        if (a.hasOwnProperty(CompareItem.compProp) && b.hasOwnProperty(CompareItem.compProp)) {
            if (a[CompareItem.compProp] < b[CompareItem.compProp]) {
                return 1;
            }
            else if (a[CompareItem.compProp] > b[CompareItem.compProp]) {
                return -1;
            }
            return 0;
        }
    }
}

/*
    only store necessary variable for reproducing same result and UI
    And it'll only based on the condition generated current result
    e.g. after search then uncheck all tags has no effect unless user press search again then store
*/
class CustomSearch {
    constructor() {
        this.settingName = "";
        this.sortProperty = sessionStorage.getItem("sortProperty");
        this.sortAsc = sessionStorage.getItem("sortAsc");
        this.tagSearchOption = sessionStorage.getItem("tagSearchOption");
        this.currentPage = sessionStorage.getItem("currentPage");
        this.selectedTags = sessionStorage.getItem("selectedTags");
        this.filteredItemList = sessionStorage.getItem("filteredItemList");
        this.searchText = sessionStorage.getItem("searchText");
    }
}

//add listener for display the left-sidebar
document.getElementById("left-sidebar-btn").addEventListener("click", function () {
    document.getElementById("left-sidebar").classList.toggle("active");
    document.getElementById("main-content").classList.toggle("test");
    if(document.getElementById("left-sidebar-btn").innerText == "<<") {
        document.getElementById("left-sidebar-btn").innerText = ">>";
    }
    else {
        document.getElementById("left-sidebar-btn").innerText = "<<";
    }
})

//special button that will randomize the order of item and reload page
document.getElementById("random-search-btn").addEventListener("click", () => {
    runFilter(Filter.randomizeFilter);
    //get to first page
    reloadWindowPageNum(0);
})

/*
special button that will reload original item list and reload page, 
also initialize sortProperty and asc/desc order
*/
document.getElementById("view-all-btn").addEventListener("click", () => {
    sessionStorage.setItem("sortAsc", "true");
    resetFilteredItemList();
    
    sessionStorage.setItem("tagSearchOption", "contain-any-tag")
    sessionStorage.setItem("sortProperty", userConfig.sortList[0]);
    sessionStorage.setItem("selectedTags", JSON.stringify([]));
    sessionStorage.setItem("searchText", "");
    //get to first page
    reloadWindowPageNum(0);
});

//search button add event
document.getElementById("search-btn").addEventListener("click", () => {
    //get to first page
    sessionStorage.setItem("currentPage", "0");
    search();
});

//add search text hit enter event
document.getElementById("search-text").addEventListener("keypress", ({ key }) => {
    if (key === "Enter") {
        document.getElementById("search-btn").click();
    }
});

//switch sort asc/desc button add event
document.getElementById("asc-desc-sort-btn").addEventListener("click", () => {
    CompareItem.compProp = getSortProperty();
    //need to reverse sortAsc first ===> resetFilteredItemList only do reset based on sortAsc 
    if (sessionStorage.getItem("sortAsc") === "true") {
        sessionStorage.setItem("sortAsc", "false");
        sortItemList(CompareItem.descendComp);
    }
    else {
        sessionStorage.setItem("sortAsc", "true");
        sortItemList(CompareItem.ascendComp);
    }

    reloadWindowPageNum();
})

//add new custom condition to use
document.getElementById("save-condition-btn").addEventListener("click", () => {
    let customSearchSetting = new CustomSearch();
    let customSettingArray = JSON.parse(localStorage.getItem("customSettingArray"));
    let currentCustomSettingNum = customSettingArray.length;

    if (currentCustomSettingNum < maxCustomCondition) {
        //default name
        let defaultSettingName = "DefaultSetting-" + genRandomName(3);
        let settingName = "";

        //prompt window using electron-prompt and creat button(electron doesn't support prompt)
        let creatCustomSettingWindow = async () => {
            let settingName = await prompt({
                title: "Custom Search",
                label: "Enter custom search name:",
                value: defaultSettingName,
                inputAttrs: {
                    type: "text"
                },
                type: "input"
            })

            if (settingName != null) {
                customSearchSetting.settingName = settingName;
                customSettingArray.push(customSearchSetting);
                localStorage.setItem("customSettingArray", JSON.stringify(customSettingArray));

                let customWrapper = document.createElement("li");
                customWrapper.setAttribute("id", "custom-wrapper-" + String(currentCustomSettingNum + 1))

                //delete button
                let customSearchDeleteBtn = document.createElement("button");
                customSearchDeleteBtn.innerText = "X";
                customSearchDeleteBtn.addEventListener("click", () => {
                    //will prompt confirmation window first
                    let deletOptions = {
                        type: "warning",
                        buttons: ["Yes", "No"],
                        message: "Do you really want to delete " + settingName + " ?"
                    }
                    //return value is the index of selection
                    let response = dialog.showMessageBoxSync(deletOptions)
                    if (response == 0) {
                        //remove object in custom setting array and set back the array to local storage
                        let customSettingArray = JSON.parse(localStorage.getItem("customSettingArray"));
                        for (let i = 0; i < customSettingArray.length; i++) {
                            if (customSettingArray[i].settingName == settingName) {
                                customSettingArray.splice(i, 1);
                                break;
                            }
                        }
                        localStorage.setItem("customSettingArray", JSON.stringify(customSettingArray));

                        //remove animation
                        $("#custom-wrapper-" + String(currentCustomSettingNum + 1)).slideUp(400);
                        //delete all children
                        while (customWrapper.hasChildNodes()) {
                            customWrapper.removeChild(customWrapper.lastChild);
                        }
                        customWrapper.remove();
                    }
                })

                let customSearchBtnElement = document.createElement("button");
                customSearchBtnElement.innerText = settingName;
                customSearchBtnElement.addEventListener("click", () => {
                    customSearchClickEventListener(customSearchSetting);
                })
                customWrapper.appendChild(customSearchDeleteBtn);
                customWrapper.appendChild(customSearchBtnElement);
                document.getElementById("custom-condition-panel").appendChild(customWrapper);

            }
            return true;
        }
        creatCustomSettingWindow();
    }
    else {
        //reach the limit of local storage number
        let reachLimitMesg = {
            type: "warning",
            message: "Reach the limit number of custom setting storage. Please delete other custom settings to store new one"
        }
        dialog.showMessageBoxSync(reachLimitMesg)
    }
})

//assign customSearch object assign to current enviroement 
export function customSearchClickEventListener(customSearchObj) {
    sessionStorage.setItem("sortProperty", customSearchObj.sortProperty);
    sessionStorage.setItem("sortAsc", customSearchObj.sortAsc);
    sessionStorage.setItem("currentPage", customSearchObj.currentPage);
    sessionStorage.setItem("filteredItemList", customSearchObj.filteredItemList);
    sessionStorage.setItem("tagSearchOption", customSearchObj.tagSearchOption)
    sessionStorage.setItem("selectedTags", customSearchObj.selectedTags);
    sessionStorage.setItem("searchText", customSearchObj.searchText);
    
    reloadWindowPageNum();
    //no need to pre-select all option and search, all info are in session storage. 
    //search will sort the list->random order will break
    //search();
}

//click event for dropdown menu of sort property, it won't change the order of asc/desc
export function sortPropertyClickEventListener(prop) {
    sessionStorage.setItem("sortProperty", prop);
    CompareItem.compProp = prop;
    if (sessionStorage.getItem("sortAsc") === "true") {
        sortItemList(CompareItem.ascendComp);
    }
    else {
        sortItemList(CompareItem.descendComp);
    }
    reloadWindowPageNum();
}

//check each condition block and push correspond filter to the list
function checkAllFilter() {
    let filterList = [];
    Filter.checkedTag = getSelectedTags();

    //text input search filter
    if (document.getElementById("search-text").value != "") {
        sessionStorage.setItem("searchText", document.getElementById("search-text").value)
        filterList.push(Filter.searchTextFilter);
    }

    //tag selection option: All, Any, Exclude
    if (Filter.checkedTag.length > 0) {
        filterList.push(getTagSearchOptionFilter());
    }

    return filterList;
}

//return correspond filter for select option: any, All, Exclude and store to sessionStorage
function getTagSearchOptionFilter() {
    let tagSearchOptionNode = document.querySelector("input[name^='tag-search-option']:checked");
    sessionStorage.setItem("tagSearchOption", tagSearchOptionNode["id"]);

    switch (tagSearchOptionNode["id"]) {
        case "contain-any-tag":
            return Filter.containAnyTagFilter;
        case "contain-all-tag":
            return Filter.containAllTagFilter;
        case "exclude-all-tag":
            return Filter.excludeTagFilter;
    }
    return Filter.containAnyTagFilter;
}

//return an array of strings with selected tags also store to sessionstorage
function getSelectedTags() {
    let tagNodeList = document.querySelectorAll("input[class^='tag']:checked");
    let tagCheckBoxes = []
    for (let node of tagNodeList) {
        tagCheckBoxes.push(node["name"]);
    }
    sessionStorage.setItem("selectedTags", JSON.stringify(tagCheckBoxes));

    return tagCheckBoxes;
}

function getSortProperty() {
    return sessionStorage.getItem("sortProperty");
}

//return random string with len
function genRandomName(len) {
    let output = "";
    const characterlist = "ABCDEFGHIJKLMNPQRSTUVWXYZ123456789";
    for(let i = 0; i < len; i++) {
        output = output + characterlist.charAt(Math.floor(Math.random() * characterlist.length));
    }
    return output;
}

//this will keep the current page
export function search() {
    let filterList = checkAllFilter();
    if (filterList.length > 0) {
        //using same sort(asc/desc) and same sort property in current status
        CompareItem.compProp = getSortProperty();
        if (sessionStorage.getItem("sortAsc") === "true") {
            sortItemList(CompareItem.ascendComp);
        }
        else {
            sortItemList(CompareItem.descendComp);
        }


        //start filter process
        for (let filterFunc of filterList) {
            runFilter(filterFunc)
        }
    }
    reloadWindowPageNum();
}

export function reloadWindowPageNum(nextPage = parseInt(sessionStorage.getItem("currentPage"))) {
    setCurrentPageItems(nextPage);
    sessionStorage.setItem("currentPage", String(nextPage));
    location.reload();
}

