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

/** create-element */
function ct(tag) {
    return document.createElement(tag);
}

/** create-text-node */
function tn(txt) {
    return document.createTextNode('' + txt);
}

/** set class */
function cl(e, v) {
    e.className = v;
    return e;
}

/** pack cld -&gt; cont */
function pack(cont, cld) {
    cont.appendChild(cld);
    return cont;
}

/** ja logiikka itte */
(function () {

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

    function parseparams() {

        /* <a>:lla saa nätisti purettu urlin */
        var tmp = ct('a');
        tmp.href = ('' + window.location);
        tmp = '' + tmp.search;
        tmp = tmp.replace(/^\?/, '').split('&');

        /* saatiin tmp = [ 'param1=aa', 'param2=bee' ] */
        tmp.forEach(function (k) {

            /* ..joten parsitaan parametrit */
            k = k.split('=');
            switch (k[0]) {
                case 'firstrow':
                    /* eka rivi */
                    firstrow = (k[1] - 0); /* ..to-int */
                    break;

                case 'lastrow':
                    /* vika rivi */
                    lastrow = (k[1] - 0);
                    break;

                case 'pagerows':
                    /* monenneltako riviltä sivutetaan */
                    pagerows = (k[1] - 0);
                    break;

                case 'pollinterval':
                    /* pollaustiheys sekunteina */
                    pollinterval = (k[1] - 0);
                    break;

                case 'bundle':
                    /* vain eka per linja per pysäkki */
                    bundle = (k[1] - 0);
                    break;

                case 'maxforwardtime':
                    /* montako sekuntia nykyhetkestä eteenpäin
                     maksimissaan mukaan */
                    maxforwardtime = (k[1] - 0);
                    break;
                case 'datakey':
                    /* kenttä jonka mukaan näytetään */
                    switch (k[1]) {
                        case 'aa':
                            datakey = 'aimedarrivaltime';
                            break;
                        case 'ad':
                            datakey = 'aimeddeparturetime';
                            break;
                        case 'ea':
                            datakey = 'expectedarrivaltime';
                            break;
                        case 'ed':
                            datakey = 'expecteddeparturetime';
                            break;
                        default:
                            datakey = 'expecteddeparturetime';
                            break;
                    }
                    break;
                case 'stops':
                    /* pysäkkilista pilkkuerotettuna tai sitten joku
                     valmis defaultti */
                    switch (k[1]) {
                        case 'ikea':
                            probeStops = ['2125', '2126'];
                            break;
                        case 'kauppatori':
                            probeStops =
                                ['T1', 'T2', 'T3', 'T4', 'T5', 'T6',
                                    'T7', 'T8', 'T9', 'T10', 'T24', 'T34',
                                    'T36', 'T38', 'T40', 'T33', 'T35', 'T37',
                                    'T39', 'T42', 'T41', 'T53'];
                            break;
                        case 'satama':
                            probeStops =
                                ['1', '2'];
                            break;
                        case 'lentokentta':
                            probeStops =
                                ['1586'];
                            break;
                        default:
                            /* pilkkueroiteltu */
                            probeStops = k[1].split(',');
                    }
                    break;
            }
        });

        /* debug */
        if (DEBUG) {

            /* :-b */
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
        var tbody = ct('tbody');
        var table = pack(ct('table'), tbody);

        if ((pagepos < firstrow) ||
            (pagepos >= sorted.length) ||
            (pagepos >= lastrow)) {
            /* pointer takaisin alkuun */
            pagepos = firstrow;
        }

        var i = pagerows;
        while ((pagepos < sorted.length) && (pagepos < lastrow) && (i--)) {

            var e = sorted[pagepos++];
            var stop = pack(ct('td'), tn(e.stopnum));
            var line = pack(ct('td'), tn(e.lineref));
            var dest = '';
            if (e.stopnum === '1586' || e.stopnum === '1' || e.stopnum === '2') {
                dest = pack(ct('td'), tn('Kauppatori'));
            } else {
                dest = pack(ct('td'), tn(e.destinationdisplay));
            }

            var sanedateAimed = strftime('H:i', e.aimeddeparturetime);
            var sanedateExpected = strftime('H:i', e[datakey]);
            var departureAimed = pack(ct('td'), tn(sanedateAimed));
            var row = cl(ct('tr'), ('row row' + (i % 2)));
            pack(row, cl(line, 'line'));
            pack(row, cl(dest, 'dest'));

            //jos arvioitu suurempi niin silloin käytetään sitä
            if (sanedateAimed < sanedateExpected) {
                var boldexpe = pack(ct('b'), tn(sanedateExpected));
                var departureExpected = pack(ct('td'), boldexpe);
                pack(row, cl(departureExpected, 'depa'));
            } else {
                pack(row, cl(departureAimed, 'depa'));
            }

            pack(row, cl(stop, 'stop'));
            pack(tbody, row);
        }

        /* vanhat pois ja uusi lista tilalle */
        var helpdiv = ct('div');

        while (listnode.firstChild) {
            listnode.removeChild(listnode.firstChild);
        }

        pack(listnode, helpdiv);
        pack(listnode, table);
    }

    /* parse jsonstop, yhteinen käsittely ie:n
     XDomainRequestilta tulevien kanssa */
    function parse(stopnum, response) {

        try {

            var resp = '';
            eval('resp = ' + response);
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

    function probeGen(stopnum) {

        var xhr = new XMLHttpRequest();
        xhr.open('GET', REST_ENDPOINT + stopnum, true);
        xhr.onreadystatechange = function () {

            if (xhr.readyState != 4)
                return; /* ei viälä valmista */

            /* else */
            if (xhr.status != 200)
                return; /* kusi, no hätä,
             interval hakee sitten uusiksi */

            /* yhteinen käsittely */
            parse(stopnum, xhr.responseText);
        };

        xhr.send();
    }

    function probeIE(stopnum) {

        var xhr = new XDomainRequest();
        xhr.open('GET', REST_ENDPOINT + stopnum);
        xhr.onload = function () {
            parse(stopnum, xhr.responseText);
        };

        /* .onerror, .ontimeout, emme piittaa, setInterval hoitaa
         ja parempi onni seuraavalla kerralla */

        xhr.send();
    }

    function poll() {

        var probe = (window.XDomainRequest && window.ActiveXObject) ?
            probeIE : probeGen;

        /* heitetään requestit keräilyyn... */
        probeStops.forEach(function (k) {
            probe(k);
        });

        /* ...ja ei kantsi sorttailla joka kuin kerran per poll(),
         viivästytetään vähän että ehtii tulokset tulla */
        window.setTimeout(sortAndDisplay, 2000);
    }

    /* asetukset url:stä */
    parseparams();

    /* timer käyntiin */
    window.setInterval(poll, (pollinterval * 1000));

    /* plus kerta-ajo heti alkuun*/
    poll();
})();
