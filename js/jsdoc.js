/*
 * This file is not linked from the HTML in any way. But at least WebStorm parses this file to
 * aid in the JSDoc type checking
 */

/**
 * @global
 * @name clock
 * @type HTMLDivElement
 */
/**
 * @global
 * @name headerLine
 * @type HTMLDivElement
 */
/**
 * @global
 * @name headerDest
 * @type HTMLDivElement
 */
/**
 * @global
 * @name headerDepa
 * @type HTMLDivElement
 */
/**
 * @global
 * @name headerStop
 * @type HTMLDivElement
 */
/**
 * The Div where the timetable results will be output
 * @global
 * @name icontent
 * @type HTMLDivElement
 */
/**
 * @global
 * @name tableheader
 * @type HTMLDivElement
 */
/**
 * @global
 * @name timetablecontainer
 * @type HTMLDivElement
 */
/**
 * @global
 * @name stopselectorcontainer
 * @type HTMLDivElement
 */

/**
 * @typedef {object} StopMonitoringData
 * @property {StopMonitoringEntry[]} result
 * @property {number} servertime - UNIX timestamp for the generated data
 * @property {string} status - "OK" if the system is running and up to date. "NO_SIRI_DATA" if the system is not providing data
 * @property {string} sys - The identifier for this system (expect "SM" for Stop Monitoring)
 */

/**
 * @typedef {object} StopMonitoringEntry
 * @property {number} aimedarrivaltime - The arrival time according to the time table
 * @property {number} expectedarrivaltime - A calculated arrival time
 * @property {number} aimeddeparturetime - The departure time according to the time table
 * @property {number} expecteddeparturetime - A calculated departure time
 * @property {string} datedvehiclejourneyref
 * @property {number} destinationaimedarrivaltime
 * @property {string} destinationdisplay - The identifier on the bus frontplate
 * @property {number} latitude
 * @property {number} longitude
 * @property {boolean} monitored - <code>true</code> iff the line can be monitored in real time
 * @property {number} originaimeddeparturetime
 * @property {number} recordedattime - UNIX timestamp of last update
 */
