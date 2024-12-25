// ==UserScript==
// @name        Warlord Inactivity Tracker
// @namespace   antril.torn.warlord
// @version     1.1
// @description shows last activity status for holders of RW weapons
// @author      Antril [3021498]
// @license     GNU GPLv3
// @run-at      document-end
// @match       https://www.torn.com/factions.php?step=your
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @connect     api.torn.com
// @require     https://code.jquery.com/jquery-3.7.0.min.js
// ==/UserScript==

/////////////
// OPTIONS //
/////////////

let apiKey = ""; // SET API KEY

// Changee the background colour here
let darkModeColour = "#544413"
let lightModeColour = "#e73121"


////////////
// SCRIPT //
////////////

if (!apiKey?.length == 16) { alert('Warlord Inactivity Tracker - No APIkey set'); return }


function getCookie (name) {
	let value = `; ${document.cookie}`;
	let parts = value.split(`; ${name}=`);
	if (parts.length === 2) return parts.pop().split(';').shift();
}

let rgxp = "\/.*tab=armoury.*sub=weapons.*"
let previous_fragment = ""
let members = {}
let backgroundColour = getCookie("darkModeEnabled") === "false" ? lightModeColour : darkModeColour
checkURLFragment();

window.addEventListener("hashchange", function (){
    checkURLFragment()
});

function setArmouryObserver() {
    var observer = new MutationObserver(function(mutations, observer) {
        $.each(mutations, function (i, mutation) {
            let addedNodes = $(mutation.addedNodes);
            let selector = $("#armoury-weapons > .item-list > li")
            let filteredEls = addedNodes.find(selector).addBack(selector);
            if(filteredEls.length > 0) {
                checkLoans();
            }
        });
    });
    observer.observe($("#armoury-weapons")[0], {childList: true, subtree: true});
}


async function checkURLFragment() {
    let fragment = window.location.hash;
    if(fragment.match(rgxp)) {
        if (!previous_fragment.match(rgxp)) {
             await loadFactionMemberStatus();
        }
        await waitForArmoury();
        setArmouryObserver();
        checkLoans();
    }
    previous_fragment = fragment
}

function JSONparse(str) {
  try {
    return JSON.parse(str);
  } catch (e) {
    console.log(e);
  }
  return null;
}

async function loadFactionMemberStatus() {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            method: "GET",
            url: `https://api.torn.com/v2/faction/members?key=${apiKey}`,
            onload: (r) => {
                let j = JSONparse(r.responseText);
                if (!j || !j.members) {
                    return;
                }
                j.members.forEach(
                    (m) => {
                        members[m.name] = m.last_action;
                    }
                )
                localStorage["torn.antril.f_members"] = JSON.stringify(members);
                resolve();
            }
        });
    })
}

function getWarlordWeaponsLoans() {
    let warlordWeapons = $("#armoury-weapons > .item-list > li").filter(function() { return $(this).find('.bonus-attachment-warlord').length != 0;})
    return warlordWeapons.filter(function() {return $(this).find(".loaned > a").length != 0}).toArray();
}

function waitForArmoury() {
    return new Promise((resolve, reject) => {
        const intervalId = setInterval(() => {
            if($("#armoury-weapons > .item-list > li").length !== 0) {
                clearInterval(intervalId);
                resolve();
            }
        }, 100);
    });
}

async function checkLoans() {
    await waitForArmoury();
    getWarlordWeaponsLoans().forEach((loan) => checkLoan(loan, Date.now()/1000));
}

function checkLoan(loan, currentTimestamp) {
   let player = $(loan).find(".loaned > a")[0].text
   let playerState = members[player]
   let timestampDelta = currentTimestamp - playerState.timestamp
   if(timestampDelta > 3600) {
       markLoanAsOverdue(loan)
   }
}

function markLoanAsOverdue(loan) {
    $(loan).find(".loaned").css("background-color", backgroundColour);
}
