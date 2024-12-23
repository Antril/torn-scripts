// ==UserScript==
// @name        Warlord Inactivity Tracker
// @namespace   antril.torn.warlord
// @version     1.0
// @description shows last activity status for holders of RW weapons
// @author      Antril [3021498]
// @license     GNU GPLv3
// @run-at      document-end
// @match       https://www.torn.com/factions.php?step=your
// @grant       GM_xmlhttpRequest
// @grant       GM_addStyle
// @connect     api.torn.com/
// @require     https://code.jquery.com/jquery-3.6.0.min.js
// ==/UserScript==

let apiKey = ""; // SET API KEY

if (!apiKey?.length == 16) { alert('Warlord Inactivity Tracker - No APIkey set'); return }

let rgxp = "\/.*tab=armoury.*sub=weapons.*"
let members = {}

checkURLFragment();

window.addEventListener("hashchange", function (){
    checkURLFragment()
});

async function checkURLFragment() {
    let hash = window.location.hash;
    if(hash.match(rgxp)) {
        await loadFactionMemberStatus()
        checkLoans();
    }
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
    $(loan).find(".loaned").css("background-color", "#544413");
}
