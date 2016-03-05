'use strict';
var DEBUG = true;
var REST_ENDPOINT = 'http://data-western.foli.fi/stops/';

/* pari helpperifunkkarit takataskukataloogista */

function strpadLeft(str, chr, len) {
    str = '' + str;
    if (len > str.length)
        for (len = len - str.length; len > 0; len--)
            str = chr.charAt(0) + str;
    return str;
}

function strftime(format, date) {

    if (!date) {
        date = new Date();
    } else if (!date.getFullYear) {
        date = new Date(date * 1000);
    }

    var c = '';
    var res = '';
    for (var i = 0; i < format.length; i++) {
        switch ((c = format.charAt(i))) {
            case 'Y':
                res += strpadLeft(date.getFullYear(), '0', 4);
                break;
            case 'm':
                res += strpadLeft(date.getMonth() + 1, '0', 2);
                break;
            case 'd':
                res += strpadLeft(date.getDate(), '0', 2);
                break;
            case 'H':
                res += strpadLeft(date.getHours(), '0', 2);
                break;
            case 'i':
                res += strpadLeft(date.getMinutes(), '0', 2);
                break;
            case 's':
                res += strpadLeft(date.getSeconds(), '0', 2);
                break;
            default:
                res += c;
        }
    }

    return res;
}

/**
 * create-element
 * @param {string} tag
 * @param {HTMLElement|string|Number} [child]
 */
function createTag(tag, child) {
    var element = document.createElement(tag);

    if (child && child instanceof Node) {
        if (child instanceof Element || child.nodeName === '#text') {
            element.appendChild(child);
        } else {
            console.error('Cannot append ' + child + ' to ' + tag);
        }
    } else if (typeof child === 'number' || typeof child === 'string') {
        element.textContent = child;
    }

    return element;
}

/**
 * @param {HTMLTableRowElement} row
 * @param {string} cellContent
 * @param {string} cellClassName
 */
function insertCell(row, cellContent, cellClassName) {
    var cell = row.insertCell(-1);
    cell.textContent = cellContent;
    cell.className = cellClassName;
}

/** set class */
function setClass(e, v) {
    e.className = v;
    return e;
}

/** ja logiikka itte */
(function () {

    /** type {Object.<*, StopMonitoringData} */
    var coll = {};

    var reftime = 0; // otetaan kello serveriltä, niin ei haittaa jos clientti väärässä ajassa
    var listnode = icontent;

    /* optiot ja defaultit */
    var firstrow = 0;
    var lastrow = 42;
    var pagerows = 14;
    var pollinterval = 30;
    var maxforwardtime = 7200;
    var datakey = 'expecteddeparturetime';
    var bundle = 1;
    var probeStops = [];

    function parseParams() {

        var pairs = window.location.search.substring(1).split('&');

        /* saatiin pairs = [ 'param1=aa', 'param2=bee' ] */
        pairs.forEach(function (pair) {

            /* ..joten parsitaan parametrit */
            pair = pair.split('=');
            var key = pair[0];
            var value = pair[1];
            var valueAsInt = (value - 0);

            switch (key) {
                case 'firstrow':
                    /* eka rivi */
                    firstrow = valueAsInt;
                    break;

                case 'lastrow':
                    /* vika rivi */
                    lastrow = valueAsInt;
                    break;

                case 'pagerows':
                    /* monenneltako riviltä sivutetaan */
                    pagerows = valueAsInt;
                    break;

                case 'pollinterval':
                    /* pollaustiheys sekunteina */
                    pollinterval = valueAsInt;
                    break;

                case 'bundle':
                    /* vain eka per linja per pysäkki */
                    bundle = valueAsInt;
                    break;

                case 'maxforwardtime':
                    /* montako sekuntia nykyhetkestä eteenpäin
                     maksimissaan mukaan */
                    maxforwardtime = valueAsInt;
                    break;
                case 'datakey':
                    /* kenttä jonka mukaan näytetään */

                    var shorthands = {
                        aa: 'aimedarrivaltime',
                        ad: 'aimeddeparturetime',
                        ea: 'expectedarrivaltime',
                        ed: 'expecteddeparturetime'
                    };

                    datakey = shorthands[value];
                    if (datakey === undefined) {
                        datakey = 'expecteddeparturetime';
                    }

                    break;
                case 'stops':
                    /* pysäkkilista pilkkuerotettuna tai sitten joku
                     valmis defaultti */
                    switch (value) {
                        case 'ikea':
                            probeStops = ['2125', '2126'];
                            break;
                        case 'kauppatori':
                            probeStops = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9',
                                'T10', 'T24', 'T34', 'T36', 'T38', 'T40', 'T33', 'T35', 'T37',
                                'T39', 'T42', 'T41', 'T53'];
                            break;
                        case 'satama':
                            probeStops = ['1', '2'];
                            break;
                        case 'lentokentta':
                            probeStops = ['1586'];
                            break;
                        default:
                            /* pilkkueroiteltu */
                            probeStops = value.split(',');
                    }
                    break;
            }
        });

        if (DEBUG) {
            console.log('firstrow: %o', firstrow);
            console.log('lastrow: %o', lastrow);
            console.log('pagerows: %o', pagerows);
            console.log('pollinterval: %o', pollinterval);
            console.log('maxforwardtime: %o', maxforwardtime);
            console.log('datakey: %o', datakey);
            console.log('bundle: %o', bundle);
            console.log('probeStops: %o', probeStops);
        }
    }

    /* timeri kutsuu tätä erikseen
     *
     * eli tämä siis keräilee ja esittää listat, kun taas probe()
     * pitää coll:a yllä
     */

    var pagepos = 0;
    function sortAndDisplay() {

        var sorted = [];
        var maxtime = reftime + maxforwardtime;
        var filterValidTime = function (e) {
            if ((e[datakey]) &&
                (e[datakey] > reftime) &&
                (e[datakey] < maxtime))
                sorted.push(e);
        };

        for (var k in coll) {
            if (coll.hasOwnProperty(k)) coll[k].forEach(filterValidTime);
        }

        /* aikajärjestys */
        sorted.sort(function (a, b) {

            /* ensisijaisesti datakey:n mukaan */
            if (a[datakey] > b[datakey])
                return 1;
            if (a[datakey] < b[datakey])
                return -1;

            /* jos sama datakey, eli sama kellonaika, sitten muitten
             kenttien mukaan, muuten hyppii saman lähtöajan rivit
             edes takaisin */
            if (a.lineref > b.lineref)
                return 1;
            if (a.lineref < b.lineref)
                return -1;

            return 0;
        });

        /* niputtaminen */
        if (bundle) {

            /* huom, sorttauksen jälkeen vasta */
            var rebundled = {};
            sorted = sorted.filter(function (k) {

                var key = k.lineref + '_' + k.stopnum;
                if (rebundled[key]) {
                    return false;
                }

                /* merkataan jo näytetyksi */
                return (rebundled[key] = true);
            });
        }

        /* display */

        /** @type HTMLTableElement */
        var table = createTag('table');

        if ((pagepos < firstrow) ||
            (pagepos >= sorted.length) ||
            (pagepos >= lastrow)) {
            /* pointer takaisin alkuun */
            pagepos = firstrow;
        }

        var i = pagerows;
        while ((pagepos < sorted.length) && (pagepos < lastrow) && (i--)) {

            //noinspection JSValidateTypes
            /** @type HTMLTableRowElement */
            var row = table.insertRow(-1);
            row.className = 'row row' + (row.rowIndex % 2);

            var e = sorted[pagepos++];

            var line = e.lineref;
            var destination = '';
            var departure = '';
            var stop = e.stopnum;

            if (e.stopnum === '1586' || e.stopnum === '1' || e.stopnum === '2') {
                destination = 'Kauppatori';
            } else {
                destination = e.destinationdisplay;
            }

            var aimedDeparture = e.aimeddeparturetime;
            var expectedDeparture = e.expecteddeparturetime;
            departure = strftime('H:i', Math.max(aimedDeparture, expectedDeparture));

            insertCell(row, line, 'line');
            insertCell(row, destination, 'dest');
            insertCell(row, departure, 'depa');
            insertCell(row, stop, 'stop');

            if (aimedDeparture < expectedDeparture) {
                row.cells.item(2).classList.add('late');
            }
        }

        /* vanhat pois ja uusi lista tilalle */
        while (listnode.firstChild) {
            listnode.removeChild(listnode.firstChild);
        }

        listnode.appendChild(table);
    }

    function parse(stopnum, response) {

        try {
            /** @type StopMonitoringData */
            var resp = JSON.parse(response);
            if (resp && resp.status) {
                if ((resp.status == 'OK') &&
                    (resp.sys == 'SM') && (resp.result)) {

                    /* ok, serverikello talteen */
                    reftime = resp.servertime;

                    /* ja keräillään kamat */
                    resp.result.forEach(function (k) {
                        k.stopnum = stopnum;
                    });

                    /* ja talten isoon mälliin */
                    coll[stopnum] = resp.result;

                } else if ((resp.status == 'AGED') ||
                    (resp.status == 'PENDING')) {

                    /* ok, tilaus lähti käyntiin */
                    console.log('%s: %s', stopnum, resp.status);

                } else {
                    console.log('Fallthru: %s = %o', stopnum, resp);
                }
            } else {
                console.log('Fail:Response: %s = %o', stopnum, resp);
            }

        } catch (err) {
            console.log('Exception: %s = %o', stopnum, err);
        }
    }

    function probe(stopnum) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', REST_ENDPOINT + stopnum, true);
        xhr.onreadystatechange = function () {

            if (xhr.readyState != 4)
                return; /* ei viälä valmista */

            /* else */
            if (xhr.status != 200)
                return; // kusi, no hätä, interval hakee sitten uusiksi

            /* yhteinen käsittely */
            parse(stopnum, xhr.responseText);
        };

        xhr.send();
    }

    function poll() {

        /* heitetään requestit keräilyyn... */
        probeStops.forEach(function (k) {
            probe(k);
        });

        /* ...ja ei kantsi sorttailla joka kuin kerran per poll(),
         viivästytetään vähän että ehtii tulokset tulla */
        window.setTimeout(sortAndDisplay, 2000);
    }

    /* asetukset url:stä */
    parseParams();

    /* timer käyntiin */
    window.setInterval(poll, (pollinterval * 1000));

    /* plus kerta-ajo heti alkuun*/
    poll();
})();
