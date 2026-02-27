/**
 * @fileoverview Comprehensive JSDoc fixture covering every JSDoc tag.
 * @author Test Suite
 * @version 1.0.0
 * @license MIT
 * @see https://jsdoc.app
 */

/**
 * Maximum number of retries.
 * @type {number}
 * @constant
 * @default 3
 * @since 1.0.0
 */
const MAX_RETRIES = 3;

/**
 * Application configuration.
 * @typedef {Object} AppConfig
 * @property {string} host - Server hostname
 * @property {number} port - Server port
 * @property {boolean} [debug=false] - Enable debug mode
 */

/**
 * Processing callback.
 * @callback ProcessCallback
 * @param {Error|null} error - Error if occurred
 * @param {*} result - Processing result
 * @returns {void}
 */

/**
 * Status enumeration.
 * @enum {string}
 * @readonly
 */
const Status = {
	/** Active status */
	ACTIVE: 'active',
	/** Inactive status */
	INACTIVE: 'inactive',
	/** @deprecated Use INACTIVE instead */
	DISABLED: 'disabled',
};

/**
 * Fetches data from a remote URL.
 *
 * @async
 * @function fetchData
 * @param {string} url - The URL to fetch from
 * @param {Object} [options] - Fetch options
 * @param {string} [options.method='GET'] - HTTP method
 * @param {Object.<string, string>} [options.headers] - Request headers
 * @param {number} [options.timeout=5000] - Timeout in milliseconds
 * @returns {Promise<Object>} The parsed response data
 * @throws {TypeError} If url is not a string
 * @throws {Error} If the network request fails
 * @example
 * const data = await fetchData('https://api.example.com/users');
 * console.log(data);
 *
 * @example
 * const data = await fetchData('https://api.example.com/users', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 * });
 *
 * @since 1.0.0
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API|Fetch API}
 */
async function fetchData(url, options = {}) {
	const { method = 'GET', headers = {}, timeout = 5000 } = options;
	return { url, method, headers, timeout };
}

/**
 * Represents a generic data container.
 *
 * @template T - The type of data stored
 * @class
 * @classdesc A container that holds and transforms data with validation.
 * @implements {Iterable<T>}
 * @example
 * const box = new DataBox(42);
 * console.log(box.getValue()); // 42
 */
class DataBox {
	/**
	 * The stored value.
	 * @type {T}
	 * @private
	 */
	#value;

	/**
	 * Instance counter.
	 * @type {number}
	 * @static
	 * @readonly
	 */
	static count = 0;

	/**
	 * Creates a new DataBox.
	 * @param {T} value - Initial value
	 * @param {Object} [meta] - Optional metadata
	 * @param {string} [meta.label] - Display label
	 * @constructs DataBox
	 */
	constructor(value, meta) {
		this.#value = value;
		/** @type {Object|undefined} */
		this.meta = meta;
		DataBox.count++;
	}

	/**
	 * Gets the stored value.
	 * @returns {T} The current value
	 * @access public
	 */
	getValue() {
		return this.#value;
	}

	/**
	 * Transforms the value using a mapper function.
	 * @template U
	 * @param {function(T): U} mapper - Transformation function
	 * @returns {DataBox<U>} A new DataBox with the transformed value
	 * @chainable
	 */
	map(mapper) {
		return new DataBox(mapper(this.#value));
	}

	/**
	 * Checks value equality.
	 * @param {DataBox<T>} other - Another DataBox to compare
	 * @returns {boolean} True if values are equal
	 * @override
	 */
	equals(other) {
		return this.#value === other.getValue();
	}

	/**
	 * @deprecated Since 2.0. Use getValue() instead.
	 * @returns {T}
	 */
	get() {
		return this.#value;
	}

	/**
	 * @generator
	 * @yields {T} The stored value
	 */
	*[Symbol.iterator]() {
		yield this.#value;
	}
}

/**
 * A mixin that adds serialization capability.
 * @mixin
 * @param {Function} Base - The base class to extend
 * @returns {Function} The extended class with serialize method
 */
function Serializable(Base) {
	return class extends Base {
		/**
		 * Serializes the instance to JSON.
		 * @returns {string} JSON string representation
		 */
		serialize() {
			return JSON.stringify(this);
		}
	};
}

/**
 * @namespace MathUtils
 * @description Mathematical utility functions
 */
const MathUtils = {
	/**
	 * Adds two numbers.
	 * @memberof MathUtils
	 * @param {number} a - First operand
	 * @param {number} b - Second operand
	 * @returns {number} Sum of a and b
	 */
	add(a, b) {
		return a + b;
	},

	/**
	 * The mathematical constant PI.
	 * @memberof MathUtils
	 * @type {number}
	 * @readonly
	 */
	PI: 3.14159265359,
};

/**
 * Creates an event handler.
 * @param {string} eventName - Name of the event
 * @param {ProcessCallback} handler - The handler callback
 * @fires EventEmitter#event:data
 * @listens EventEmitter#event:error
 * @returns {Function} Unsubscribe function
 */
function onEvent(eventName, handler) {
	return () => {};
}

/**
 * Formats a user's display name.
 * @param {string} first - First name
 * @param {string} last - Last name
 * @param {Object} [options]
 * @param {boolean} [options.uppercase=false] - Whether to uppercase
 * @returns {string} Formatted name
 * @todo Add middle name support
 * @todo Add internationalization
 */
function formatName(first, last, options = {}) {
	const name = `${first} ${last}`;
	return options.uppercase ? name.toUpperCase() : name;
}

/**
 * @global
 * @var {string} APP_NAME - The application name
 */
var APP_NAME = 'TestApp';

module.exports = { MAX_RETRIES, Status, fetchData, DataBox, Serializable, MathUtils, onEvent, formatName, APP_NAME };
