
/* ie-fixup */
(function() {
    if (!Array.prototype.forEach) {
        Array.prototype.forEach = function(func) {

            var len = (this.length - 0);
            if (typeof (func) != "function")
                throw new TypeError();

            var thisp = arguments[1];
            for (var i = 0; i < len; i++) {
                if (i in this)
                    func.call(thisp, this[i], i, this);
            }
        };
    }

    if (!Array.prototype.filter) {
        Array.prototype.filter = function(func) {

            var len = (this.length - 0);
            if (typeof (func) != "function")
                throw new TypeError();

            var res = new Array();
            var thisp = arguments[1];
            for (var i = 0; i < len; i++) {
                if (i in this) {
                    var val = this[i];
                    if (func.call(thisp, val, i, this))
                        res.push(val);
                }
            }

            return res;
        };
    }

    /* puuttuvat consolet + pelit */
    function dummylog() {
        /* void */
    }
    ;
    if (!window.console)
        window.console = {};
    if (!window.console.log)
        window.console.log = dummylog;
    if (!window.console.dir)
        window.console.log = dummylog;

})();

/* pari helpperifunkkarit takataskukataloogista */
function strpad_left(str, chr, len) {
    str = '' + str;
    if (len > str.length)
        for (len = len - str.length; len > 0; len--)
            str = chr.charAt(0) + str;
    return str;
}
function strpad_right(str, chr, len) {
    str = '' + str;
    if (len > str.length)
        for (len = len - str.length; len > 0; len--)
            str += chr.charAt(0);
    return str;
}
function strftime(format, date) {

    if (!date) {
        date = new Date();
    } else if (!date.getFullYear) {
        date = new Date(date * 1000);
    }

    var c, res = '';
    for (var i = 0; i < format.length; i++) {
        switch ((c = format.charAt(i))) {
            case 'Y':
                res += strpad_left(date.getFullYear(), '0', 4);
                break;
            case 'm':
                res += strpad_left(date.getMonth() + 1, '0', 2);
                break;
            case 'd':
                res += strpad_left(date.getDate(), '0', 2);
                break;
            case 'H':
                res += strpad_left(date.getHours(), '0', 2);
                break;
            case 'i':
                res += strpad_left(date.getMinutes(), '0', 2);
                break;
            case 's':
                res += strpad_left(date.getSeconds(), '0', 2);
                break;
            default:
                res += c;
        }
    }

    return res;
}

/* get-element */
function el(v) {
    if (v.setAttribute)
        return v;
    return document.getElementById(v);
}

/* create-element */
function ct(tag) {
    return document.createElement(tag);
}

/* create-text-node */
function tn(txt) {
    return document.createTextNode('' + txt);
}

/* remove-child */
function rc(e) {
    e = el(e);
    while (e.firstChild)
        e.removeChild(e.firstChild);
    return e;
}

/* set-attribute */
function at(e, a, v) {
    if (!(e = el(e)))
        return false;
    e.setAttribute(a, v);
    return e;
}

/* set class */
function cl(e, v) {
    if (!(e = el(e)))
        return false;
    return (typeof (v) == 'string') ?
        at(at(e, 'class', v), 'className', v) :
        ac(ac(e, 'class'), 'className');
}

/* pack cld -> cont */
function pack(cont, cld) {
    cont.appendChild(cld);
    return cont;
}

/* ja logiikka itte */
(function() {

    var coll = {};
    var reftime = 0; /* otetaan kello serveriltä, niin ei haittaa jos
     * clientti väärässä ajassa */
    var listnode = el('icontent');

    /* optiot ja defaultit */
    var firstrow = 0;
    //var lastrow = 0x7fffffff;
    var lastrow = 42;
    var pagerows = 14;
    var pollinterval = 30;
    var maxforwardtime = 7200;
    var datakey = 'expecteddeparturetime';
    var bundle = 1;
    var probe_stops = [];

    function parseparams() {

        /* <a>:lla saa nätisti purettu urlin */
        var tmp = ct('a');
        tmp.href = ('' + window.location);
        tmp = '' + tmp.search;
        tmp = tmp.replace(/^\?/, '').split('&');

        /* saatiin tmp = [ 'param1=aa', 'param2=bee' ] */
        tmp.forEach(function(k) {

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

                case 'stops':
                    /* pysäkkilista pilkkuerotettuna tai sitten joku
                     valmis defaultti */
                    switch (k[1]) {
                        case 'ikea':
                            probe_stops = ['2125', '2126'];
                            break;
                        case 'kauppatori':
                            probe_stops =
                                ['T1', 'T2', 'T3', 'T4', 'T5', 'T6',
                                    'T7', 'T8', 'T9', 'T10', 'T24', 'T34',
                                    'T36', 'T38', 'T40', 'T33', 'T35', 'T37',
                                    'T39', 'T42', 'T41', 'T53'];
                            break;
                        case 'satama':
                            probe_stops =
                                ['1', '2'];
                            break;
                        case 'lentokentta':
                            probe_stops =
                                ['1586'];
                            break;
                        case 'lapa':
                            probe_stops =
                                ['1736', '1735', '420'];
                            break;
                        case 'mara':
                            probe_stops =
                                ['T5', 'T33', 'T7', '31', '821'];
                            break;
                        case 'jari':
                            probe_stops =
                                ['T7','3008'];
                            break;
                        case 'pete':
                            probe_stops =
                                ['T4', 'T35', '391', '364', '392'];
                            break;
                        default:
                            /* pilkkueroiteltu */
                            probe_stops = k[1].split(',');
                    }
                    break;
            }
        });

        /* debug */
        if (true) {

            /* :-b */
            console.log('firstrow: %o', firstrow);
            console.log('lastrow: %o', lastrow);
            console.log('pagerows: %o', pagerows);
            console.log('pollinterval: %o', pollinterval);
            console.log('maxforwardtime: %o', maxforwardtime);
            console.log('datakey: %o', datakey);
            console.log('bundle: %o', bundle);
            console.log('probe_stops: %o', probe_stops);
        }
    }


    /* timeri kutsuu tätä erikseen
     *
     * eli tämä siis keräilee ja esittää listat, kun taas probe()
     * pitää coll:a yllä
     */

    var pagepos = 0;
    var incremental = 0;
    function sort_and_display() {

        var sorted = [];
        var maxtime = reftime + maxforwardtime;
        for (var k in coll) {
            coll[k].forEach(function(e) {
                if ((e[datakey]) &&
                    (e[datakey] > reftime) &&
                    (e[datakey] < maxtime))
                    sorted.push(e);
            });
        }

        /* aikajärjestys */
        sorted.sort(function(a, b) {

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
            sorted = sorted.filter(function(k) {

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


// eli etsiään tagi id:ll var tag = el('ititle');
// tyhjennetään rc(tag), + pakataan uusi text-node pack(tag, tn('Lijne'))


        /* kielipyöritys */
//        var titlediv = el('ititle');
//        if (titlediv) {
//            if ((incremental++) % 2) {
//                pack(rc(ititle), tn('Linje'));
//            } else {
//                pack(rc(ititle), tn('Linja'));
//            }
//        }

//        var titlerow = cl(ct('tr'), 'headerrow');
//        var titleline = pack(ct('td'), tn('Linja'));
//        var titledest = pack(ct('td'), tn('Määränpää'));
//        var titleaimed = pack(ct('td'), tn('Aikataulu'));
//        var titleexpected = pack(ct('td'), tn('Arvioitu'));
//        var titlestop = pack(ct('td'), tn('Pysäkki'));
//
//        var spantitle = cl(ct('span'), 'title');
//        var liststart = cl(ct('ul'), 'texts');
//        var listend = cl(ct(li))
//
//        pack(titlerow, cl(titleline, ''));
//        pack(titlerow, cl(titledest, ''));
//        pack(titlerow, cl(titleaimed, ''));
//        pack(titlerow, cl(titleexpected, ''));
//        pack(titlerow, cl(titlestop, ''));
//        pack(tbody, titlerow);

        var i = pagerows;
        var origpos = pagepos;
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
            var sanedateAimed = strftime('H:i', e['aimeddeparturetime']);
            var sanedateExpected = strftime('H:i', e[datakey]);
            var departureAimed = pack(ct('td'), tn(sanedateAimed));
            //var departureExpected = pack(ct('td'), tn(sanedateExpected));
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
        //pack(helpdiv, tn('Sivu : ' + origpos + ' / ' + sorted.length));
        pack(rc(listnode), helpdiv);
        pack(listnode, table);
    }

    /* parse jsonstop, yhteinen käsittely ie:n
     XDomainRequestilta tulevien kanssa */
    function parse(stopnum, response) {

        try {

            eval('var resp = ' + response);
            if (resp && resp.status) {
                if ((resp.status == 'OK') &&
                    (resp.sys == 'SM') && (resp.result)) {

                    /* ok, serverikello talteen */
                    reftime = resp.servertime;

                    /* ja keräillään kamat */
                    resp.result.forEach(function(k) {
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

    function probe_gen(stopnum) {

        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'http://data-western.foli.fi/stops/' + stopnum, true);
        xhr.onreadystatechange = function() {

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

    function probe_ie(stopnum) {

        var xhr = new XDomainRequest();
        xhr.open('GET', 'http://data-western.foli.fi/stops/' + stopnum);
        xhr.onload = function() {
            parse(stopnum, xhr.responseText);
        };

        /* .onerror, .ontimeout, emme piittaa, setInterval hoitaa
         ja parempi onni seuraavalla kerralla */

        xhr.send();
    }

    function poll() {

        var probe = (window.XDomainRequest && window.ActiveXObject) ?
            probe_ie : probe_gen;

        /* heitetään requestit keräilyyn... */
        probe_stops.forEach(function(k) {
            probe(k);
        });

        /* ...ja ei kantsi sorttailla joka kuin kerran per poll(),
         viivästytetään vähän että ehtii tulokset tulla */
        window.setTimeout(sort_and_display, 2000);
    }

    /* asetukset url:stä */
    parseparams();

    /* timer käyntiin */
    window.setInterval(poll, (pollinterval * 1000));

    /* plus kerta-ajo heti alkuun*/
    poll();
})();


/*
 Local variables: ***
 mode: javascript ***
 coding: utf-8 ***
 file-coding-system: utf-8 ***
 c-basic-offset: 4 ***
 End: ***
 */

