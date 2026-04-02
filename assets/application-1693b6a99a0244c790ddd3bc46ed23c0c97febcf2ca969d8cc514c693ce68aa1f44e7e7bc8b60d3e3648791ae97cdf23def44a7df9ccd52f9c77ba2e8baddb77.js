/* PrismJS 1.30.0
https://prismjs.com/download.html#themes=prism&languages=markup+css+clike+javascript+bash+c+cpp+cmake+coffeescript+crystal+d+dart+diff+django+dot+elixir+erlang+go+groovy+java+json+julia+kotlin+latex+lua+markdown+markup-templating+matlab+nginx+nim+nix+ocaml+perl+php+python+qml+r+jsx+ruby+rust+scss+scala+shell-session+sql+tcl+typescript+yaml+zig */
/// <reference lib="WebWorker"/>

var _self = (typeof window !== 'undefined')
	? window   // if in browser
	: (
		(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope)
			? self // if in worker
			: {}   // if in node js
	);

/**
 * Prism: Lightweight, robust, elegant syntax highlighting
 *
 * @license MIT <https://opensource.org/licenses/MIT>
 * @author Lea Verou <https://lea.verou.me>
 * @namespace
 * @public
 */
var Prism = (function (_self) {

	// Private helper vars
	var lang = /(?:^|\s)lang(?:uage)?-([\w-]+)(?=\s|$)/i;
	var uniqueId = 0;

	// The grammar object for plaintext
	var plainTextGrammar = {};


	var _ = {
		/**
		 * By default, Prism will attempt to highlight all code elements (by calling {@link Prism.highlightAll}) on the
		 * current page after the page finished loading. This might be a problem if e.g. you wanted to asynchronously load
		 * additional languages or plugins yourself.
		 *
		 * By setting this value to `true`, Prism will not automatically highlight all code elements on the page.
		 *
		 * You obviously have to change this value before the automatic highlighting started. To do this, you can add an
		 * empty Prism object into the global scope before loading the Prism script like this:
		 *
		 * ```js
		 * window.Prism = window.Prism || {};
		 * Prism.manual = true;
		 * // add a new <script> to load Prism's script
		 * ```
		 *
		 * @default false
		 * @type {boolean}
		 * @memberof Prism
		 * @public
		 */
		manual: _self.Prism && _self.Prism.manual,
		/**
		 * By default, if Prism is in a web worker, it assumes that it is in a worker it created itself, so it uses
		 * `addEventListener` to communicate with its parent instance. However, if you're using Prism manually in your
		 * own worker, you don't want it to do this.
		 *
		 * By setting this value to `true`, Prism will not add its own listeners to the worker.
		 *
		 * You obviously have to change this value before Prism executes. To do this, you can add an
		 * empty Prism object into the global scope before loading the Prism script like this:
		 *
		 * ```js
		 * window.Prism = window.Prism || {};
		 * Prism.disableWorkerMessageHandler = true;
		 * // Load Prism's script
		 * ```
		 *
		 * @default false
		 * @type {boolean}
		 * @memberof Prism
		 * @public
		 */
		disableWorkerMessageHandler: _self.Prism && _self.Prism.disableWorkerMessageHandler,

		/**
		 * A namespace for utility methods.
		 *
		 * All function in this namespace that are not explicitly marked as _public_ are for __internal use only__ and may
		 * change or disappear at any time.
		 *
		 * @namespace
		 * @memberof Prism
		 */
		util: {
			encode: function encode(tokens) {
				if (tokens instanceof Token) {
					return new Token(tokens.type, encode(tokens.content), tokens.alias);
				} else if (Array.isArray(tokens)) {
					return tokens.map(encode);
				} else {
					return tokens.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\u00a0/g, ' ');
				}
			},

			/**
			 * Returns the name of the type of the given value.
			 *
			 * @param {any} o
			 * @returns {string}
			 * @example
			 * type(null)      === 'Null'
			 * type(undefined) === 'Undefined'
			 * type(123)       === 'Number'
			 * type('foo')     === 'String'
			 * type(true)      === 'Boolean'
			 * type([1, 2])    === 'Array'
			 * type({})        === 'Object'
			 * type(String)    === 'Function'
			 * type(/abc+/)    === 'RegExp'
			 */
			type: function (o) {
				return Object.prototype.toString.call(o).slice(8, -1);
			},

			/**
			 * Returns a unique number for the given object. Later calls will still return the same number.
			 *
			 * @param {Object} obj
			 * @returns {number}
			 */
			objId: function (obj) {
				if (!obj['__id']) {
					Object.defineProperty(obj, '__id', { value: ++uniqueId });
				}
				return obj['__id'];
			},

			/**
			 * Creates a deep clone of the given object.
			 *
			 * The main intended use of this function is to clone language definitions.
			 *
			 * @param {T} o
			 * @param {Record<number, any>} [visited]
			 * @returns {T}
			 * @template T
			 */
			clone: function deepClone(o, visited) {
				visited = visited || {};

				var clone; var id;
				switch (_.util.type(o)) {
					case 'Object':
						id = _.util.objId(o);
						if (visited[id]) {
							return visited[id];
						}
						clone = /** @type {Record<string, any>} */ ({});
						visited[id] = clone;

						for (var key in o) {
							if (o.hasOwnProperty(key)) {
								clone[key] = deepClone(o[key], visited);
							}
						}

						return /** @type {any} */ (clone);

					case 'Array':
						id = _.util.objId(o);
						if (visited[id]) {
							return visited[id];
						}
						clone = [];
						visited[id] = clone;

						(/** @type {Array} */(/** @type {any} */(o))).forEach(function (v, i) {
							clone[i] = deepClone(v, visited);
						});

						return /** @type {any} */ (clone);

					default:
						return o;
				}
			},

			/**
			 * Returns the Prism language of the given element set by a `language-xxxx` or `lang-xxxx` class.
			 *
			 * If no language is set for the element or the element is `null` or `undefined`, `none` will be returned.
			 *
			 * @param {Element} element
			 * @returns {string}
			 */
			getLanguage: function (element) {
				while (element) {
					var m = lang.exec(element.className);
					if (m) {
						return m[1].toLowerCase();
					}
					element = element.parentElement;
				}
				return 'none';
			},

			/**
			 * Sets the Prism `language-xxxx` class of the given element.
			 *
			 * @param {Element} element
			 * @param {string} language
			 * @returns {void}
			 */
			setLanguage: function (element, language) {
				// remove all `language-xxxx` classes
				// (this might leave behind a leading space)
				element.className = element.className.replace(RegExp(lang, 'gi'), '');

				// add the new `language-xxxx` class
				// (using `classList` will automatically clean up spaces for us)
				element.classList.add('language-' + language);
			},

			/**
			 * Returns the script element that is currently executing.
			 *
			 * This does __not__ work for line script element.
			 *
			 * @returns {HTMLScriptElement | null}
			 */
			currentScript: function () {
				if (typeof document === 'undefined') {
					return null;
				}
				if (document.currentScript && document.currentScript.tagName === 'SCRIPT' && 1 < 2 /* hack to trip TS' flow analysis */) {
					return /** @type {any} */ (document.currentScript);
				}

				// IE11 workaround
				// we'll get the src of the current script by parsing IE11's error stack trace
				// this will not work for inline scripts

				try {
					throw new Error();
				} catch (err) {
					// Get file src url from stack. Specifically works with the format of stack traces in IE.
					// A stack will look like this:
					//
					// Error
					//    at _.util.currentScript (http://localhost/components/prism-core.js:119:5)
					//    at Global code (http://localhost/components/prism-core.js:606:1)

					var src = (/at [^(\r\n]*\((.*):[^:]+:[^:]+\)$/i.exec(err.stack) || [])[1];
					if (src) {
						var scripts = document.getElementsByTagName('script');
						for (var i in scripts) {
							if (scripts[i].src == src) {
								return scripts[i];
							}
						}
					}
					return null;
				}
			},

			/**
			 * Returns whether a given class is active for `element`.
			 *
			 * The class can be activated if `element` or one of its ancestors has the given class and it can be deactivated
			 * if `element` or one of its ancestors has the negated version of the given class. The _negated version_ of the
			 * given class is just the given class with a `no-` prefix.
			 *
			 * Whether the class is active is determined by the closest ancestor of `element` (where `element` itself is
			 * closest ancestor) that has the given class or the negated version of it. If neither `element` nor any of its
			 * ancestors have the given class or the negated version of it, then the default activation will be returned.
			 *
			 * In the paradoxical situation where the closest ancestor contains __both__ the given class and the negated
			 * version of it, the class is considered active.
			 *
			 * @param {Element} element
			 * @param {string} className
			 * @param {boolean} [defaultActivation=false]
			 * @returns {boolean}
			 */
			isActive: function (element, className, defaultActivation) {
				var no = 'no-' + className;

				while (element) {
					var classList = element.classList;
					if (classList.contains(className)) {
						return true;
					}
					if (classList.contains(no)) {
						return false;
					}
					element = element.parentElement;
				}
				return !!defaultActivation;
			}
		},

		/**
		 * This namespace contains all currently loaded languages and the some helper functions to create and modify languages.
		 *
		 * @namespace
		 * @memberof Prism
		 * @public
		 */
		languages: {
			/**
			 * The grammar for plain, unformatted text.
			 */
			plain: plainTextGrammar,
			plaintext: plainTextGrammar,
			text: plainTextGrammar,
			txt: plainTextGrammar,

			/**
			 * Creates a deep copy of the language with the given id and appends the given tokens.
			 *
			 * If a token in `redef` also appears in the copied language, then the existing token in the copied language
			 * will be overwritten at its original position.
			 *
			 * ## Best practices
			 *
			 * Since the position of overwriting tokens (token in `redef` that overwrite tokens in the copied language)
			 * doesn't matter, they can technically be in any order. However, this can be confusing to others that trying to
			 * understand the language definition because, normally, the order of tokens matters in Prism grammars.
			 *
			 * Therefore, it is encouraged to order overwriting tokens according to the positions of the overwritten tokens.
			 * Furthermore, all non-overwriting tokens should be placed after the overwriting ones.
			 *
			 * @param {string} id The id of the language to extend. This has to be a key in `Prism.languages`.
			 * @param {Grammar} redef The new tokens to append.
			 * @returns {Grammar} The new language created.
			 * @public
			 * @example
			 * Prism.languages['css-with-colors'] = Prism.languages.extend('css', {
			 *     // Prism.languages.css already has a 'comment' token, so this token will overwrite CSS' 'comment' token
			 *     // at its original position
			 *     'comment': { ... },
			 *     // CSS doesn't have a 'color' token, so this token will be appended
			 *     'color': /\b(?:red|green|blue)\b/
			 * });
			 */
			extend: function (id, redef) {
				var lang = _.util.clone(_.languages[id]);

				for (var key in redef) {
					lang[key] = redef[key];
				}

				return lang;
			},

			/**
			 * Inserts tokens _before_ another token in a language definition or any other grammar.
			 *
			 * ## Usage
			 *
			 * This helper method makes it easy to modify existing languages. For example, the CSS language definition
			 * not only defines CSS highlighting for CSS documents, but also needs to define highlighting for CSS embedded
			 * in HTML through `<style>` elements. To do this, it needs to modify `Prism.languages.markup` and add the
			 * appropriate tokens. However, `Prism.languages.markup` is a regular JavaScript object literal, so if you do
			 * this:
			 *
			 * ```js
			 * Prism.languages.markup.style = {
			 *     // token
			 * };
			 * ```
			 *
			 * then the `style` token will be added (and processed) at the end. `insertBefore` allows you to insert tokens
			 * before existing tokens. For the CSS example above, you would use it like this:
			 *
			 * ```js
			 * Prism.languages.insertBefore('markup', 'cdata', {
			 *     'style': {
			 *         // token
			 *     }
			 * });
			 * ```
			 *
			 * ## Special cases
			 *
			 * If the grammars of `inside` and `insert` have tokens with the same name, the tokens in `inside`'s grammar
			 * will be ignored.
			 *
			 * This behavior can be used to insert tokens after `before`:
			 *
			 * ```js
			 * Prism.languages.insertBefore('markup', 'comment', {
			 *     'comment': Prism.languages.markup.comment,
			 *     // tokens after 'comment'
			 * });
			 * ```
			 *
			 * ## Limitations
			 *
			 * The main problem `insertBefore` has to solve is iteration order. Since ES2015, the iteration order for object
			 * properties is guaranteed to be the insertion order (except for integer keys) but some browsers behave
			 * differently when keys are deleted and re-inserted. So `insertBefore` can't be implemented by temporarily
			 * deleting properties which is necessary to insert at arbitrary positions.
			 *
			 * To solve this problem, `insertBefore` doesn't actually insert the given tokens into the target object.
			 * Instead, it will create a new object and replace all references to the target object with the new one. This
			 * can be done without temporarily deleting properties, so the iteration order is well-defined.
			 *
			 * However, only references that can be reached from `Prism.languages` or `insert` will be replaced. I.e. if
			 * you hold the target object in a variable, then the value of the variable will not change.
			 *
			 * ```js
			 * var oldMarkup = Prism.languages.markup;
			 * var newMarkup = Prism.languages.insertBefore('markup', 'comment', { ... });
			 *
			 * assert(oldMarkup !== Prism.languages.markup);
			 * assert(newMarkup === Prism.languages.markup);
			 * ```
			 *
			 * @param {string} inside The property of `root` (e.g. a language id in `Prism.languages`) that contains the
			 * object to be modified.
			 * @param {string} before The key to insert before.
			 * @param {Grammar} insert An object containing the key-value pairs to be inserted.
			 * @param {Object<string, any>} [root] The object containing `inside`, i.e. the object that contains the
			 * object to be modified.
			 *
			 * Defaults to `Prism.languages`.
			 * @returns {Grammar} The new grammar object.
			 * @public
			 */
			insertBefore: function (inside, before, insert, root) {
				root = root || /** @type {any} */ (_.languages);
				var grammar = root[inside];
				/** @type {Grammar} */
				var ret = {};

				for (var token in grammar) {
					if (grammar.hasOwnProperty(token)) {

						if (token == before) {
							for (var newToken in insert) {
								if (insert.hasOwnProperty(newToken)) {
									ret[newToken] = insert[newToken];
								}
							}
						}

						// Do not insert token which also occur in insert. See #1525
						if (!insert.hasOwnProperty(token)) {
							ret[token] = grammar[token];
						}
					}
				}

				var old = root[inside];
				root[inside] = ret;

				// Update references in other language definitions
				_.languages.DFS(_.languages, function (key, value) {
					if (value === old && key != inside) {
						this[key] = ret;
					}
				});

				return ret;
			},

			// Traverse a language definition with Depth First Search
			DFS: function DFS(o, callback, type, visited) {
				visited = visited || {};

				var objId = _.util.objId;

				for (var i in o) {
					if (o.hasOwnProperty(i)) {
						callback.call(o, i, o[i], type || i);

						var property = o[i];
						var propertyType = _.util.type(property);

						if (propertyType === 'Object' && !visited[objId(property)]) {
							visited[objId(property)] = true;
							DFS(property, callback, null, visited);
						} else if (propertyType === 'Array' && !visited[objId(property)]) {
							visited[objId(property)] = true;
							DFS(property, callback, i, visited);
						}
					}
				}
			}
		},

		plugins: {},

		/**
		 * This is the most high-level function in Prism’s API.
		 * It fetches all the elements that have a `.language-xxxx` class and then calls {@link Prism.highlightElement} on
		 * each one of them.
		 *
		 * This is equivalent to `Prism.highlightAllUnder(document, async, callback)`.
		 *
		 * @param {boolean} [async=false] Same as in {@link Prism.highlightAllUnder}.
		 * @param {HighlightCallback} [callback] Same as in {@link Prism.highlightAllUnder}.
		 * @memberof Prism
		 * @public
		 */
		highlightAll: function (async, callback) {
			_.highlightAllUnder(document, async, callback);
		},

		/**
		 * Fetches all the descendants of `container` that have a `.language-xxxx` class and then calls
		 * {@link Prism.highlightElement} on each one of them.
		 *
		 * The following hooks will be run:
		 * 1. `before-highlightall`
		 * 2. `before-all-elements-highlight`
		 * 3. All hooks of {@link Prism.highlightElement} for each element.
		 *
		 * @param {ParentNode} container The root element, whose descendants that have a `.language-xxxx` class will be highlighted.
		 * @param {boolean} [async=false] Whether each element is to be highlighted asynchronously using Web Workers.
		 * @param {HighlightCallback} [callback] An optional callback to be invoked on each element after its highlighting is done.
		 * @memberof Prism
		 * @public
		 */
		highlightAllUnder: function (container, async, callback) {
			var env = {
				callback: callback,
				container: container,
				selector: 'code[class*="language-"], [class*="language-"] code, code[class*="lang-"], [class*="lang-"] code'
			};

			_.hooks.run('before-highlightall', env);

			env.elements = Array.prototype.slice.apply(env.container.querySelectorAll(env.selector));

			_.hooks.run('before-all-elements-highlight', env);

			for (var i = 0, element; (element = env.elements[i++]);) {
				_.highlightElement(element, async === true, env.callback);
			}
		},

		/**
		 * Highlights the code inside a single element.
		 *
		 * The following hooks will be run:
		 * 1. `before-sanity-check`
		 * 2. `before-highlight`
		 * 3. All hooks of {@link Prism.highlight}. These hooks will be run by an asynchronous worker if `async` is `true`.
		 * 4. `before-insert`
		 * 5. `after-highlight`
		 * 6. `complete`
		 *
		 * Some the above hooks will be skipped if the element doesn't contain any text or there is no grammar loaded for
		 * the element's language.
		 *
		 * @param {Element} element The element containing the code.
		 * It must have a class of `language-xxxx` to be processed, where `xxxx` is a valid language identifier.
		 * @param {boolean} [async=false] Whether the element is to be highlighted asynchronously using Web Workers
		 * to improve performance and avoid blocking the UI when highlighting very large chunks of code. This option is
		 * [disabled by default](https://prismjs.com/faq.html#why-is-asynchronous-highlighting-disabled-by-default).
		 *
		 * Note: All language definitions required to highlight the code must be included in the main `prism.js` file for
		 * asynchronous highlighting to work. You can build your own bundle on the
		 * [Download page](https://prismjs.com/download.html).
		 * @param {HighlightCallback} [callback] An optional callback to be invoked after the highlighting is done.
		 * Mostly useful when `async` is `true`, since in that case, the highlighting is done asynchronously.
		 * @memberof Prism
		 * @public
		 */
		highlightElement: function (element, async, callback) {
			// Find language
			var language = _.util.getLanguage(element);
			var grammar = _.languages[language];

			// Set language on the element, if not present
			_.util.setLanguage(element, language);

			// Set language on the parent, for styling
			var parent = element.parentElement;
			if (parent && parent.nodeName.toLowerCase() === 'pre') {
				_.util.setLanguage(parent, language);
			}

			var code = element.textContent;

			var env = {
				element: element,
				language: language,
				grammar: grammar,
				code: code
			};

			function insertHighlightedCode(highlightedCode) {
				env.highlightedCode = highlightedCode;

				_.hooks.run('before-insert', env);

				env.element.innerHTML = env.highlightedCode;

				_.hooks.run('after-highlight', env);
				_.hooks.run('complete', env);
				callback && callback.call(env.element);
			}

			_.hooks.run('before-sanity-check', env);

			// plugins may change/add the parent/element
			parent = env.element.parentElement;
			if (parent && parent.nodeName.toLowerCase() === 'pre' && !parent.hasAttribute('tabindex')) {
				parent.setAttribute('tabindex', '0');
			}

			if (!env.code) {
				_.hooks.run('complete', env);
				callback && callback.call(env.element);
				return;
			}

			_.hooks.run('before-highlight', env);

			if (!env.grammar) {
				insertHighlightedCode(_.util.encode(env.code));
				return;
			}

			if (async && _self.Worker) {
				var worker = new Worker(_.filename);

				worker.onmessage = function (evt) {
					insertHighlightedCode(evt.data);
				};

				worker.postMessage(JSON.stringify({
					language: env.language,
					code: env.code,
					immediateClose: true
				}));
			} else {
				insertHighlightedCode(_.highlight(env.code, env.grammar, env.language));
			}
		},

		/**
		 * Low-level function, only use if you know what you’re doing. It accepts a string of text as input
		 * and the language definitions to use, and returns a string with the HTML produced.
		 *
		 * The following hooks will be run:
		 * 1. `before-tokenize`
		 * 2. `after-tokenize`
		 * 3. `wrap`: On each {@link Token}.
		 *
		 * @param {string} text A string with the code to be highlighted.
		 * @param {Grammar} grammar An object containing the tokens to use.
		 *
		 * Usually a language definition like `Prism.languages.markup`.
		 * @param {string} language The name of the language definition passed to `grammar`.
		 * @returns {string} The highlighted HTML.
		 * @memberof Prism
		 * @public
		 * @example
		 * Prism.highlight('var foo = true;', Prism.languages.javascript, 'javascript');
		 */
		highlight: function (text, grammar, language) {
			var env = {
				code: text,
				grammar: grammar,
				language: language
			};
			_.hooks.run('before-tokenize', env);
			if (!env.grammar) {
				throw new Error('The language "' + env.language + '" has no grammar.');
			}
			env.tokens = _.tokenize(env.code, env.grammar);
			_.hooks.run('after-tokenize', env);
			return Token.stringify(_.util.encode(env.tokens), env.language);
		},

		/**
		 * This is the heart of Prism, and the most low-level function you can use. It accepts a string of text as input
		 * and the language definitions to use, and returns an array with the tokenized code.
		 *
		 * When the language definition includes nested tokens, the function is called recursively on each of these tokens.
		 *
		 * This method could be useful in other contexts as well, as a very crude parser.
		 *
		 * @param {string} text A string with the code to be highlighted.
		 * @param {Grammar} grammar An object containing the tokens to use.
		 *
		 * Usually a language definition like `Prism.languages.markup`.
		 * @returns {TokenStream} An array of strings and tokens, a token stream.
		 * @memberof Prism
		 * @public
		 * @example
		 * let code = `var foo = 0;`;
		 * let tokens = Prism.tokenize(code, Prism.languages.javascript);
		 * tokens.forEach(token => {
		 *     if (token instanceof Prism.Token && token.type === 'number') {
		 *         console.log(`Found numeric literal: ${token.content}`);
		 *     }
		 * });
		 */
		tokenize: function (text, grammar) {
			var rest = grammar.rest;
			if (rest) {
				for (var token in rest) {
					grammar[token] = rest[token];
				}

				delete grammar.rest;
			}

			var tokenList = new LinkedList();
			addAfter(tokenList, tokenList.head, text);

			matchGrammar(text, tokenList, grammar, tokenList.head, 0);

			return toArray(tokenList);
		},

		/**
		 * @namespace
		 * @memberof Prism
		 * @public
		 */
		hooks: {
			all: {},

			/**
			 * Adds the given callback to the list of callbacks for the given hook.
			 *
			 * The callback will be invoked when the hook it is registered for is run.
			 * Hooks are usually directly run by a highlight function but you can also run hooks yourself.
			 *
			 * One callback function can be registered to multiple hooks and the same hook multiple times.
			 *
			 * @param {string} name The name of the hook.
			 * @param {HookCallback} callback The callback function which is given environment variables.
			 * @public
			 */
			add: function (name, callback) {
				var hooks = _.hooks.all;

				hooks[name] = hooks[name] || [];

				hooks[name].push(callback);
			},

			/**
			 * Runs a hook invoking all registered callbacks with the given environment variables.
			 *
			 * Callbacks will be invoked synchronously and in the order in which they were registered.
			 *
			 * @param {string} name The name of the hook.
			 * @param {Object<string, any>} env The environment variables of the hook passed to all callbacks registered.
			 * @public
			 */
			run: function (name, env) {
				var callbacks = _.hooks.all[name];

				if (!callbacks || !callbacks.length) {
					return;
				}

				for (var i = 0, callback; (callback = callbacks[i++]);) {
					callback(env);
				}
			}
		},

		Token: Token
	};
	_self.Prism = _;


	// Typescript note:
	// The following can be used to import the Token type in JSDoc:
	//
	//   @typedef {InstanceType<import("./prism-core")["Token"]>} Token

	/**
	 * Creates a new token.
	 *
	 * @param {string} type See {@link Token#type type}
	 * @param {string | TokenStream} content See {@link Token#content content}
	 * @param {string|string[]} [alias] The alias(es) of the token.
	 * @param {string} [matchedStr=""] A copy of the full string this token was created from.
	 * @class
	 * @global
	 * @public
	 */
	function Token(type, content, alias, matchedStr) {
		/**
		 * The type of the token.
		 *
		 * This is usually the key of a pattern in a {@link Grammar}.
		 *
		 * @type {string}
		 * @see GrammarToken
		 * @public
		 */
		this.type = type;
		/**
		 * The strings or tokens contained by this token.
		 *
		 * This will be a token stream if the pattern matched also defined an `inside` grammar.
		 *
		 * @type {string | TokenStream}
		 * @public
		 */
		this.content = content;
		/**
		 * The alias(es) of the token.
		 *
		 * @type {string|string[]}
		 * @see GrammarToken
		 * @public
		 */
		this.alias = alias;
		// Copy of the full string this token was created from
		this.length = (matchedStr || '').length | 0;
	}

	/**
	 * A token stream is an array of strings and {@link Token Token} objects.
	 *
	 * Token streams have to fulfill a few properties that are assumed by most functions (mostly internal ones) that process
	 * them.
	 *
	 * 1. No adjacent strings.
	 * 2. No empty strings.
	 *
	 *    The only exception here is the token stream that only contains the empty string and nothing else.
	 *
	 * @typedef {Array<string | Token>} TokenStream
	 * @global
	 * @public
	 */

	/**
	 * Converts the given token or token stream to an HTML representation.
	 *
	 * The following hooks will be run:
	 * 1. `wrap`: On each {@link Token}.
	 *
	 * @param {string | Token | TokenStream} o The token or token stream to be converted.
	 * @param {string} language The name of current language.
	 * @returns {string} The HTML representation of the token or token stream.
	 * @memberof Token
	 * @static
	 */
	Token.stringify = function stringify(o, language) {
		if (typeof o == 'string') {
			return o;
		}
		if (Array.isArray(o)) {
			var s = '';
			o.forEach(function (e) {
				s += stringify(e, language);
			});
			return s;
		}

		var env = {
			type: o.type,
			content: stringify(o.content, language),
			tag: 'span',
			classes: ['token', o.type],
			attributes: {},
			language: language
		};

		var aliases = o.alias;
		if (aliases) {
			if (Array.isArray(aliases)) {
				Array.prototype.push.apply(env.classes, aliases);
			} else {
				env.classes.push(aliases);
			}
		}

		_.hooks.run('wrap', env);

		var attributes = '';
		for (var name in env.attributes) {
			attributes += ' ' + name + '="' + (env.attributes[name] || '').replace(/"/g, '&quot;') + '"';
		}

		return '<' + env.tag + ' class="' + env.classes.join(' ') + '"' + attributes + '>' + env.content + '</' + env.tag + '>';
	};

	/**
	 * @param {RegExp} pattern
	 * @param {number} pos
	 * @param {string} text
	 * @param {boolean} lookbehind
	 * @returns {RegExpExecArray | null}
	 */
	function matchPattern(pattern, pos, text, lookbehind) {
		pattern.lastIndex = pos;
		var match = pattern.exec(text);
		if (match && lookbehind && match[1]) {
			// change the match to remove the text matched by the Prism lookbehind group
			var lookbehindLength = match[1].length;
			match.index += lookbehindLength;
			match[0] = match[0].slice(lookbehindLength);
		}
		return match;
	}

	/**
	 * @param {string} text
	 * @param {LinkedList<string | Token>} tokenList
	 * @param {any} grammar
	 * @param {LinkedListNode<string | Token>} startNode
	 * @param {number} startPos
	 * @param {RematchOptions} [rematch]
	 * @returns {void}
	 * @private
	 *
	 * @typedef RematchOptions
	 * @property {string} cause
	 * @property {number} reach
	 */
	function matchGrammar(text, tokenList, grammar, startNode, startPos, rematch) {
		for (var token in grammar) {
			if (!grammar.hasOwnProperty(token) || !grammar[token]) {
				continue;
			}

			var patterns = grammar[token];
			patterns = Array.isArray(patterns) ? patterns : [patterns];

			for (var j = 0; j < patterns.length; ++j) {
				if (rematch && rematch.cause == token + ',' + j) {
					return;
				}

				var patternObj = patterns[j];
				var inside = patternObj.inside;
				var lookbehind = !!patternObj.lookbehind;
				var greedy = !!patternObj.greedy;
				var alias = patternObj.alias;

				if (greedy && !patternObj.pattern.global) {
					// Without the global flag, lastIndex won't work
					var flags = patternObj.pattern.toString().match(/[imsuy]*$/)[0];
					patternObj.pattern = RegExp(patternObj.pattern.source, flags + 'g');
				}

				/** @type {RegExp} */
				var pattern = patternObj.pattern || patternObj;

				for ( // iterate the token list and keep track of the current token/string position
					var currentNode = startNode.next, pos = startPos;
					currentNode !== tokenList.tail;
					pos += currentNode.value.length, currentNode = currentNode.next
				) {

					if (rematch && pos >= rematch.reach) {
						break;
					}

					var str = currentNode.value;

					if (tokenList.length > text.length) {
						// Something went terribly wrong, ABORT, ABORT!
						return;
					}

					if (str instanceof Token) {
						continue;
					}

					var removeCount = 1; // this is the to parameter of removeBetween
					var match;

					if (greedy) {
						match = matchPattern(pattern, pos, text, lookbehind);
						if (!match || match.index >= text.length) {
							break;
						}

						var from = match.index;
						var to = match.index + match[0].length;
						var p = pos;

						// find the node that contains the match
						p += currentNode.value.length;
						while (from >= p) {
							currentNode = currentNode.next;
							p += currentNode.value.length;
						}
						// adjust pos (and p)
						p -= currentNode.value.length;
						pos = p;

						// the current node is a Token, then the match starts inside another Token, which is invalid
						if (currentNode.value instanceof Token) {
							continue;
						}

						// find the last node which is affected by this match
						for (
							var k = currentNode;
							k !== tokenList.tail && (p < to || typeof k.value === 'string');
							k = k.next
						) {
							removeCount++;
							p += k.value.length;
						}
						removeCount--;

						// replace with the new match
						str = text.slice(pos, p);
						match.index -= pos;
					} else {
						match = matchPattern(pattern, 0, str, lookbehind);
						if (!match) {
							continue;
						}
					}

					// eslint-disable-next-line no-redeclare
					var from = match.index;
					var matchStr = match[0];
					var before = str.slice(0, from);
					var after = str.slice(from + matchStr.length);

					var reach = pos + str.length;
					if (rematch && reach > rematch.reach) {
						rematch.reach = reach;
					}

					var removeFrom = currentNode.prev;

					if (before) {
						removeFrom = addAfter(tokenList, removeFrom, before);
						pos += before.length;
					}

					removeRange(tokenList, removeFrom, removeCount);

					var wrapped = new Token(token, inside ? _.tokenize(matchStr, inside) : matchStr, alias, matchStr);
					currentNode = addAfter(tokenList, removeFrom, wrapped);

					if (after) {
						addAfter(tokenList, currentNode, after);
					}

					if (removeCount > 1) {
						// at least one Token object was removed, so we have to do some rematching
						// this can only happen if the current pattern is greedy

						/** @type {RematchOptions} */
						var nestedRematch = {
							cause: token + ',' + j,
							reach: reach
						};
						matchGrammar(text, tokenList, grammar, currentNode.prev, pos, nestedRematch);

						// the reach might have been extended because of the rematching
						if (rematch && nestedRematch.reach > rematch.reach) {
							rematch.reach = nestedRematch.reach;
						}
					}
				}
			}
		}
	}

	/**
	 * @typedef LinkedListNode
	 * @property {T} value
	 * @property {LinkedListNode<T> | null} prev The previous node.
	 * @property {LinkedListNode<T> | null} next The next node.
	 * @template T
	 * @private
	 */

	/**
	 * @template T
	 * @private
	 */
	function LinkedList() {
		/** @type {LinkedListNode<T>} */
		var head = { value: null, prev: null, next: null };
		/** @type {LinkedListNode<T>} */
		var tail = { value: null, prev: head, next: null };
		head.next = tail;

		/** @type {LinkedListNode<T>} */
		this.head = head;
		/** @type {LinkedListNode<T>} */
		this.tail = tail;
		this.length = 0;
	}

	/**
	 * Adds a new node with the given value to the list.
	 *
	 * @param {LinkedList<T>} list
	 * @param {LinkedListNode<T>} node
	 * @param {T} value
	 * @returns {LinkedListNode<T>} The added node.
	 * @template T
	 */
	function addAfter(list, node, value) {
		// assumes that node != list.tail && values.length >= 0
		var next = node.next;

		var newNode = { value: value, prev: node, next: next };
		node.next = newNode;
		next.prev = newNode;
		list.length++;

		return newNode;
	}
	/**
	 * Removes `count` nodes after the given node. The given node will not be removed.
	 *
	 * @param {LinkedList<T>} list
	 * @param {LinkedListNode<T>} node
	 * @param {number} count
	 * @template T
	 */
	function removeRange(list, node, count) {
		var next = node.next;
		for (var i = 0; i < count && next !== list.tail; i++) {
			next = next.next;
		}
		node.next = next;
		next.prev = node;
		list.length -= i;
	}
	/**
	 * @param {LinkedList<T>} list
	 * @returns {T[]}
	 * @template T
	 */
	function toArray(list) {
		var array = [];
		var node = list.head.next;
		while (node !== list.tail) {
			array.push(node.value);
			node = node.next;
		}
		return array;
	}


	if (!_self.document) {
		if (!_self.addEventListener) {
			// in Node.js
			return _;
		}

		if (!_.disableWorkerMessageHandler) {
			// In worker
			_self.addEventListener('message', function (evt) {
				var message = JSON.parse(evt.data);
				var lang = message.language;
				var code = message.code;
				var immediateClose = message.immediateClose;

				_self.postMessage(_.highlight(code, _.languages[lang], lang));
				if (immediateClose) {
					_self.close();
				}
			}, false);
		}

		return _;
	}

	// Get current script and highlight
	var script = _.util.currentScript();

	if (script) {
		_.filename = script.src;

		if (script.hasAttribute('data-manual')) {
			_.manual = true;
		}
	}

	function highlightAutomaticallyCallback() {
		if (!_.manual) {
			_.highlightAll();
		}
	}

	if (!_.manual) {
		// If the document state is "loading", then we'll use DOMContentLoaded.
		// If the document state is "interactive" and the prism.js script is deferred, then we'll also use the
		// DOMContentLoaded event because there might be some plugins or languages which have also been deferred and they
		// might take longer one animation frame to execute which can create a race condition where only some plugins have
		// been loaded when Prism.highlightAll() is executed, depending on how fast resources are loaded.
		// See https://github.com/PrismJS/prism/issues/2102
		var readyState = document.readyState;
		if (readyState === 'loading' || readyState === 'interactive' && script && script.defer) {
			document.addEventListener('DOMContentLoaded', highlightAutomaticallyCallback);
		} else {
			if (window.requestAnimationFrame) {
				window.requestAnimationFrame(highlightAutomaticallyCallback);
			} else {
				window.setTimeout(highlightAutomaticallyCallback, 16);
			}
		}
	}

	return _;

}(_self));

if (typeof module !== 'undefined' && module.exports) {
	module.exports = Prism;
}

// hack for components to work correctly in node.js
if (typeof global !== 'undefined') {
	global.Prism = Prism;
}

// some additional documentation/types

/**
 * The expansion of a simple `RegExp` literal to support additional properties.
 *
 * @typedef GrammarToken
 * @property {RegExp} pattern The regular expression of the token.
 * @property {boolean} [lookbehind=false] If `true`, then the first capturing group of `pattern` will (effectively)
 * behave as a lookbehind group meaning that the captured text will not be part of the matched text of the new token.
 * @property {boolean} [greedy=false] Whether the token is greedy.
 * @property {string|string[]} [alias] An optional alias or list of aliases.
 * @property {Grammar} [inside] The nested grammar of this token.
 *
 * The `inside` grammar will be used to tokenize the text value of each token of this kind.
 *
 * This can be used to make nested and even recursive language definitions.
 *
 * Note: This can cause infinite recursion. Be careful when you embed different languages or even the same language into
 * each another.
 * @global
 * @public
 */

/**
 * @typedef Grammar
 * @type {Object<string, RegExp | GrammarToken | Array<RegExp | GrammarToken>>}
 * @property {Grammar} [rest] An optional grammar object that will be appended to this grammar.
 * @global
 * @public
 */

/**
 * A function which will invoked after an element was successfully highlighted.
 *
 * @callback HighlightCallback
 * @param {Element} element The element successfully highlighted.
 * @returns {void}
 * @global
 * @public
 */

/**
 * @callback HookCallback
 * @param {Object<string, any>} env The environment variables of the hook.
 * @returns {void}
 * @global
 * @public
 */
;
Prism.languages.markup = {
	'comment': {
		pattern: /<!--(?:(?!<!--)[\s\S])*?-->/,
		greedy: true
	},
	'prolog': {
		pattern: /<\?[\s\S]+?\?>/,
		greedy: true
	},
	'doctype': {
		// https://www.w3.org/TR/xml/#NT-doctypedecl
		pattern: /<!DOCTYPE(?:[^>"'[\]]|"[^"]*"|'[^']*')+(?:\[(?:[^<"'\]]|"[^"]*"|'[^']*'|<(?!!--)|<!--(?:[^-]|-(?!->))*-->)*\]\s*)?>/i,
		greedy: true,
		inside: {
			'internal-subset': {
				pattern: /(^[^\[]*\[)[\s\S]+(?=\]>$)/,
				lookbehind: true,
				greedy: true,
				inside: null // see below
			},
			'string': {
				pattern: /"[^"]*"|'[^']*'/,
				greedy: true
			},
			'punctuation': /^<!|>$|[[\]]/,
			'doctype-tag': /^DOCTYPE/i,
			'name': /[^\s<>'"]+/
		}
	},
	'cdata': {
		pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
		greedy: true
	},
	'tag': {
		pattern: /<\/?(?!\d)[^\s>\/=$<%]+(?:\s(?:\s*[^\s>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))|(?=[\s/>])))+)?\s*\/?>/,
		greedy: true,
		inside: {
			'tag': {
				pattern: /^<\/?[^\s>\/]+/,
				inside: {
					'punctuation': /^<\/?/,
					'namespace': /^[^\s>\/:]+:/
				}
			},
			'special-attr': [],
			'attr-value': {
				pattern: /=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+)/,
				inside: {
					'punctuation': [
						{
							pattern: /^=/,
							alias: 'attr-equals'
						},
						{
							pattern: /^(\s*)["']|["']$/,
							lookbehind: true
						}
					]
				}
			},
			'punctuation': /\/?>/,
			'attr-name': {
				pattern: /[^\s>\/]+/,
				inside: {
					'namespace': /^[^\s>\/:]+:/
				}
			}

		}
	},
	'entity': [
		{
			pattern: /&[\da-z]{1,8};/i,
			alias: 'named-entity'
		},
		/&#x?[\da-f]{1,8};/i
	]
};

Prism.languages.markup['tag'].inside['attr-value'].inside['entity'] =
	Prism.languages.markup['entity'];
Prism.languages.markup['doctype'].inside['internal-subset'].inside = Prism.languages.markup;

// Plugin to make entity title show the real entity, idea by Roman Komarov
Prism.hooks.add('wrap', function (env) {

	if (env.type === 'entity') {
		env.attributes['title'] = env.content.replace(/&amp;/, '&');
	}
});

Object.defineProperty(Prism.languages.markup.tag, 'addInlined', {
	/**
	 * Adds an inlined language to markup.
	 *
	 * An example of an inlined language is CSS with `<style>` tags.
	 *
	 * @param {string} tagName The name of the tag that contains the inlined language. This name will be treated as
	 * case insensitive.
	 * @param {string} lang The language key.
	 * @example
	 * addInlined('style', 'css');
	 */
	value: function addInlined(tagName, lang) {
		var includedCdataInside = {};
		includedCdataInside['language-' + lang] = {
			pattern: /(^<!\[CDATA\[)[\s\S]+?(?=\]\]>$)/i,
			lookbehind: true,
			inside: Prism.languages[lang]
		};
		includedCdataInside['cdata'] = /^<!\[CDATA\[|\]\]>$/i;

		var inside = {
			'included-cdata': {
				pattern: /<!\[CDATA\[[\s\S]*?\]\]>/i,
				inside: includedCdataInside
			}
		};
		inside['language-' + lang] = {
			pattern: /[\s\S]+/,
			inside: Prism.languages[lang]
		};

		var def = {};
		def[tagName] = {
			pattern: RegExp(/(<__[^>]*>)(?:<!\[CDATA\[(?:[^\]]|\](?!\]>))*\]\]>|(?!<!\[CDATA\[)[\s\S])*?(?=<\/__>)/.source.replace(/__/g, function () { return tagName; }), 'i'),
			lookbehind: true,
			greedy: true,
			inside: inside
		};

		Prism.languages.insertBefore('markup', 'cdata', def);
	}
});
Object.defineProperty(Prism.languages.markup.tag, 'addAttribute', {
	/**
	 * Adds an pattern to highlight languages embedded in HTML attributes.
	 *
	 * An example of an inlined language is CSS with `style` attributes.
	 *
	 * @param {string} attrName The name of the tag that contains the inlined language. This name will be treated as
	 * case insensitive.
	 * @param {string} lang The language key.
	 * @example
	 * addAttribute('style', 'css');
	 */
	value: function (attrName, lang) {
		Prism.languages.markup.tag.inside['special-attr'].push({
			pattern: RegExp(
				/(^|["'\s])/.source + '(?:' + attrName + ')' + /\s*=\s*(?:"[^"]*"|'[^']*'|[^\s'">=]+(?=[\s>]))/.source,
				'i'
			),
			lookbehind: true,
			inside: {
				'attr-name': /^[^\s=]+/,
				'attr-value': {
					pattern: /=[\s\S]+/,
					inside: {
						'value': {
							pattern: /(^=\s*(["']|(?!["'])))\S[\s\S]*(?=\2$)/,
							lookbehind: true,
							alias: [lang, 'language-' + lang],
							inside: Prism.languages[lang]
						},
						'punctuation': [
							{
								pattern: /^=/,
								alias: 'attr-equals'
							},
							/"|'/
						]
					}
				}
			}
		});
	}
});

Prism.languages.html = Prism.languages.markup;
Prism.languages.mathml = Prism.languages.markup;
Prism.languages.svg = Prism.languages.markup;

Prism.languages.xml = Prism.languages.extend('markup', {});
Prism.languages.ssml = Prism.languages.xml;
Prism.languages.atom = Prism.languages.xml;
Prism.languages.rss = Prism.languages.xml;

(function (Prism) {

	var string = /(?:"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n])*')/;

	Prism.languages.css = {
		'comment': /\/\*[\s\S]*?\*\//,
		'atrule': {
			pattern: RegExp('@[\\w-](?:' + /[^;{\s"']|\s+(?!\s)/.source + '|' + string.source + ')*?' + /(?:;|(?=\s*\{))/.source),
			inside: {
				'rule': /^@[\w-]+/,
				'selector-function-argument': {
					pattern: /(\bselector\s*\(\s*(?![\s)]))(?:[^()\s]|\s+(?![\s)])|\((?:[^()]|\([^()]*\))*\))+(?=\s*\))/,
					lookbehind: true,
					alias: 'selector'
				},
				'keyword': {
					pattern: /(^|[^\w-])(?:and|not|only|or)(?![\w-])/,
					lookbehind: true
				}
				// See rest below
			}
		},
		'url': {
			// https://drafts.csswg.org/css-values-3/#urls
			pattern: RegExp('\\burl\\((?:' + string.source + '|' + /(?:[^\\\r\n()"']|\\[\s\S])*/.source + ')\\)', 'i'),
			greedy: true,
			inside: {
				'function': /^url/i,
				'punctuation': /^\(|\)$/,
				'string': {
					pattern: RegExp('^' + string.source + '$'),
					alias: 'url'
				}
			}
		},
		'selector': {
			pattern: RegExp('(^|[{}\\s])[^{}\\s](?:[^{};"\'\\s]|\\s+(?![\\s{])|' + string.source + ')*(?=\\s*\\{)'),
			lookbehind: true
		},
		'string': {
			pattern: string,
			greedy: true
		},
		'property': {
			pattern: /(^|[^-\w\xA0-\uFFFF])(?!\s)[-_a-z\xA0-\uFFFF](?:(?!\s)[-\w\xA0-\uFFFF])*(?=\s*:)/i,
			lookbehind: true
		},
		'important': /!important\b/i,
		'function': {
			pattern: /(^|[^-a-z0-9])[-a-z0-9]+(?=\()/i,
			lookbehind: true
		},
		'punctuation': /[(){};:,]/
	};

	Prism.languages.css['atrule'].inside.rest = Prism.languages.css;

	var markup = Prism.languages.markup;
	if (markup) {
		markup.tag.addInlined('style', 'css');
		markup.tag.addAttribute('style', 'css');
	}

}(Prism));

Prism.languages.clike = {
	'comment': [
		{
			pattern: /(^|[^\\])\/\*[\s\S]*?(?:\*\/|$)/,
			lookbehind: true,
			greedy: true
		},
		{
			pattern: /(^|[^\\:])\/\/.*/,
			lookbehind: true,
			greedy: true
		}
	],
	'string': {
		pattern: /(["'])(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
		greedy: true
	},
	'class-name': {
		pattern: /(\b(?:class|extends|implements|instanceof|interface|new|trait)\s+|\bcatch\s+\()[\w.\\]+/i,
		lookbehind: true,
		inside: {
			'punctuation': /[.\\]/
		}
	},
	'keyword': /\b(?:break|catch|continue|do|else|finally|for|function|if|in|instanceof|new|null|return|throw|try|while)\b/,
	'boolean': /\b(?:false|true)\b/,
	'function': /\b\w+(?=\()/,
	'number': /\b0x[\da-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i,
	'operator': /[<>]=?|[!=]=?=?|--?|\+\+?|&&?|\|\|?|[?*/~^%]/,
	'punctuation': /[{}[\];(),.:]/
};

Prism.languages.javascript = Prism.languages.extend('clike', {
	'class-name': [
		Prism.languages.clike['class-name'],
		{
			pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$A-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\.(?:constructor|prototype))/,
			lookbehind: true
		}
	],
	'keyword': [
		{
			pattern: /((?:^|\})\s*)catch\b/,
			lookbehind: true
		},
		{
			pattern: /(^|[^.]|\.\.\.\s*)\b(?:as|assert(?=\s*\{)|async(?=\s*(?:function\b|\(|[$\w\xA0-\uFFFF]|$))|await|break|case|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally(?=\s*(?:\{|$))|for|from(?=\s*(?:['"]|$))|function|(?:get|set)(?=\s*(?:[#\[$\w\xA0-\uFFFF]|$))|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)\b/,
			lookbehind: true
		},
	],
	// Allow for all non-ASCII characters (See http://stackoverflow.com/a/2008444)
	'function': /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*(?:\.\s*(?:apply|bind|call)\s*)?\()/,
	'number': {
		pattern: RegExp(
			/(^|[^\w$])/.source +
			'(?:' +
			(
				// constant
				/NaN|Infinity/.source +
				'|' +
				// binary integer
				/0[bB][01]+(?:_[01]+)*n?/.source +
				'|' +
				// octal integer
				/0[oO][0-7]+(?:_[0-7]+)*n?/.source +
				'|' +
				// hexadecimal integer
				/0[xX][\dA-Fa-f]+(?:_[\dA-Fa-f]+)*n?/.source +
				'|' +
				// decimal bigint
				/\d+(?:_\d+)*n/.source +
				'|' +
				// decimal number (integer or float) but no bigint
				/(?:\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[Ee][+-]?\d+(?:_\d+)*)?/.source
			) +
			')' +
			/(?![\w$])/.source
		),
		lookbehind: true
	},
	'operator': /--|\+\+|\*\*=?|=>|&&=?|\|\|=?|[!=]==|<<=?|>>>?=?|[-+*/%&|^!=<>]=?|\.{3}|\?\?=?|\?\.?|[~:]/
});

Prism.languages.javascript['class-name'][0].pattern = /(\b(?:class|extends|implements|instanceof|interface|new)\s+)[\w.\\]+/;

Prism.languages.insertBefore('javascript', 'keyword', {
	'regex': {
		pattern: RegExp(
			// lookbehind
			// eslint-disable-next-line regexp/no-dupe-characters-character-class
			/((?:^|[^$\w\xA0-\uFFFF."'\])\s]|\b(?:return|yield))\s*)/.source +
			// Regex pattern:
			// There are 2 regex patterns here. The RegExp set notation proposal added support for nested character
			// classes if the `v` flag is present. Unfortunately, nested CCs are both context-free and incompatible
			// with the only syntax, so we have to define 2 different regex patterns.
			/\//.source +
			'(?:' +
			/(?:\[(?:[^\]\\\r\n]|\\.)*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}/.source +
			'|' +
			// `v` flag syntax. This supports 3 levels of nested character classes.
			/(?:\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.|\[(?:[^[\]\\\r\n]|\\.)*\])*\])*\]|\\.|[^/\\\[\r\n])+\/[dgimyus]{0,7}v[dgimyus]{0,7}/.source +
			')' +
			// lookahead
			/(?=(?:\s|\/\*(?:[^*]|\*(?!\/))*\*\/)*(?:$|[\r\n,.;:})\]]|\/\/))/.source
		),
		lookbehind: true,
		greedy: true,
		inside: {
			'regex-source': {
				pattern: /^(\/)[\s\S]+(?=\/[a-z]*$)/,
				lookbehind: true,
				alias: 'language-regex',
				inside: Prism.languages.regex
			},
			'regex-delimiter': /^\/|\/$/,
			'regex-flags': /^[a-z]+$/,
		}
	},
	// This must be declared before keyword because we use "function" inside the look-forward
	'function-variable': {
		pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*[=:]\s*(?:async\s*)?(?:\bfunction\b|(?:\((?:[^()]|\([^()]*\))*\)|(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)\s*=>))/,
		alias: 'function'
	},
	'parameter': [
		{
			pattern: /(function(?:\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*)?\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\))/,
			lookbehind: true,
			inside: Prism.languages.javascript
		},
		{
			pattern: /(^|[^$\w\xA0-\uFFFF])(?!\s)[_$a-z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*=>)/i,
			lookbehind: true,
			inside: Prism.languages.javascript
		},
		{
			pattern: /(\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*=>)/,
			lookbehind: true,
			inside: Prism.languages.javascript
		},
		{
			pattern: /((?:\b|\s|^)(?!(?:as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|try|typeof|undefined|var|void|while|with|yield)(?![$\w\xA0-\uFFFF]))(?:(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*)\(\s*|\]\s*\(\s*)(?!\s)(?:[^()\s]|\s+(?![\s)])|\([^()]*\))+(?=\s*\)\s*\{)/,
			lookbehind: true,
			inside: Prism.languages.javascript
		}
	],
	'constant': /\b[A-Z](?:[A-Z_]|\dx?)*\b/
});

Prism.languages.insertBefore('javascript', 'string', {
	'hashbang': {
		pattern: /^#!.*/,
		greedy: true,
		alias: 'comment'
	},
	'template-string': {
		pattern: /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}|(?!\$\{)[^\\`])*`/,
		greedy: true,
		inside: {
			'template-punctuation': {
				pattern: /^`|`$/,
				alias: 'string'
			},
			'interpolation': {
				pattern: /((?:^|[^\\])(?:\\{2})*)\$\{(?:[^{}]|\{(?:[^{}]|\{[^}]*\})*\})+\}/,
				lookbehind: true,
				inside: {
					'interpolation-punctuation': {
						pattern: /^\$\{|\}$/,
						alias: 'punctuation'
					},
					rest: Prism.languages.javascript
				}
			},
			'string': /[\s\S]+/
		}
	},
	'string-property': {
		pattern: /((?:^|[,{])[ \t]*)(["'])(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2(?=\s*:)/m,
		lookbehind: true,
		greedy: true,
		alias: 'property'
	}
});

Prism.languages.insertBefore('javascript', 'operator', {
	'literal-property': {
		pattern: /((?:^|[,{])[ \t]*)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?=\s*:)/m,
		lookbehind: true,
		alias: 'property'
	},
});

if (Prism.languages.markup) {
	Prism.languages.markup.tag.addInlined('script', 'javascript');

	// add attribute support for all DOM events.
	// https://developer.mozilla.org/en-US/docs/Web/Events#Standard_events
	Prism.languages.markup.tag.addAttribute(
		/on(?:abort|blur|change|click|composition(?:end|start|update)|dblclick|error|focus(?:in|out)?|key(?:down|up)|load|mouse(?:down|enter|leave|move|out|over|up)|reset|resize|scroll|select|slotchange|submit|unload|wheel)/.source,
		'javascript'
	);
}

Prism.languages.js = Prism.languages.javascript;

(function (Prism) {
	// $ set | grep '^[A-Z][^[:space:]]*=' | cut -d= -f1 | tr '\n' '|'
	// + LC_ALL, RANDOM, REPLY, SECONDS.
	// + make sure PS1..4 are here as they are not always set,
	// - some useless things.
	var envVars = '\\b(?:BASH|BASHOPTS|BASH_ALIASES|BASH_ARGC|BASH_ARGV|BASH_CMDS|BASH_COMPLETION_COMPAT_DIR|BASH_LINENO|BASH_REMATCH|BASH_SOURCE|BASH_VERSINFO|BASH_VERSION|COLORTERM|COLUMNS|COMP_WORDBREAKS|DBUS_SESSION_BUS_ADDRESS|DEFAULTS_PATH|DESKTOP_SESSION|DIRSTACK|DISPLAY|EUID|GDMSESSION|GDM_LANG|GNOME_KEYRING_CONTROL|GNOME_KEYRING_PID|GPG_AGENT_INFO|GROUPS|HISTCONTROL|HISTFILE|HISTFILESIZE|HISTSIZE|HOME|HOSTNAME|HOSTTYPE|IFS|INSTANCE|JOB|LANG|LANGUAGE|LC_ADDRESS|LC_ALL|LC_IDENTIFICATION|LC_MEASUREMENT|LC_MONETARY|LC_NAME|LC_NUMERIC|LC_PAPER|LC_TELEPHONE|LC_TIME|LESSCLOSE|LESSOPEN|LINES|LOGNAME|LS_COLORS|MACHTYPE|MAILCHECK|MANDATORY_PATH|NO_AT_BRIDGE|OLDPWD|OPTERR|OPTIND|ORBIT_SOCKETDIR|OSTYPE|PAPERSIZE|PATH|PIPESTATUS|PPID|PS1|PS2|PS3|PS4|PWD|RANDOM|REPLY|SECONDS|SELINUX_INIT|SESSION|SESSIONTYPE|SESSION_MANAGER|SHELL|SHELLOPTS|SHLVL|SSH_AUTH_SOCK|TERM|UID|UPSTART_EVENTS|UPSTART_INSTANCE|UPSTART_JOB|UPSTART_SESSION|USER|WINDOWID|XAUTHORITY|XDG_CONFIG_DIRS|XDG_CURRENT_DESKTOP|XDG_DATA_DIRS|XDG_GREETER_DATA_DIR|XDG_MENU_PREFIX|XDG_RUNTIME_DIR|XDG_SEAT|XDG_SEAT_PATH|XDG_SESSION_DESKTOP|XDG_SESSION_ID|XDG_SESSION_PATH|XDG_SESSION_TYPE|XDG_VTNR|XMODIFIERS)\\b';

	var commandAfterHeredoc = {
		pattern: /(^(["']?)\w+\2)[ \t]+\S.*/,
		lookbehind: true,
		alias: 'punctuation', // this looks reasonably well in all themes
		inside: null // see below
	};

	var insideString = {
		'bash': commandAfterHeredoc,
		'environment': {
			pattern: RegExp('\\$' + envVars),
			alias: 'constant'
		},
		'variable': [
			// [0]: Arithmetic Environment
			{
				pattern: /\$?\(\([\s\S]+?\)\)/,
				greedy: true,
				inside: {
					// If there is a $ sign at the beginning highlight $(( and )) as variable
					'variable': [
						{
							pattern: /(^\$\(\([\s\S]+)\)\)/,
							lookbehind: true
						},
						/^\$\(\(/
					],
					'number': /\b0x[\dA-Fa-f]+\b|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[Ee]-?\d+)?/,
					// Operators according to https://www.gnu.org/software/bash/manual/bashref.html#Shell-Arithmetic
					'operator': /--|\+\+|\*\*=?|<<=?|>>=?|&&|\|\||[=!+\-*/%<>^&|]=?|[?~:]/,
					// If there is no $ sign at the beginning highlight (( and )) as punctuation
					'punctuation': /\(\(?|\)\)?|,|;/
				}
			},
			// [1]: Command Substitution
			{
				pattern: /\$\((?:\([^)]+\)|[^()])+\)|`[^`]+`/,
				greedy: true,
				inside: {
					'variable': /^\$\(|^`|\)$|`$/
				}
			},
			// [2]: Brace expansion
			{
				pattern: /\$\{[^}]+\}/,
				greedy: true,
				inside: {
					'operator': /:[-=?+]?|[!\/]|##?|%%?|\^\^?|,,?/,
					'punctuation': /[\[\]]/,
					'environment': {
						pattern: RegExp('(\\{)' + envVars),
						lookbehind: true,
						alias: 'constant'
					}
				}
			},
			/\$(?:\w+|[#?*!@$])/
		],
		// Escape sequences from echo and printf's manuals, and escaped quotes.
		'entity': /\\(?:[abceEfnrtv\\"]|O?[0-7]{1,3}|U[0-9a-fA-F]{8}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{1,2})/
	};

	Prism.languages.bash = {
		'shebang': {
			pattern: /^#!\s*\/.*/,
			alias: 'important'
		},
		'comment': {
			pattern: /(^|[^"{\\$])#.*/,
			lookbehind: true
		},
		'function-name': [
			// a) function foo {
			// b) foo() {
			// c) function foo() {
			// but not “foo {”
			{
				// a) and c)
				pattern: /(\bfunction\s+)[\w-]+(?=(?:\s*\(?:\s*\))?\s*\{)/,
				lookbehind: true,
				alias: 'function'
			},
			{
				// b)
				pattern: /\b[\w-]+(?=\s*\(\s*\)\s*\{)/,
				alias: 'function'
			}
		],
		// Highlight variable names as variables in for and select beginnings.
		'for-or-select': {
			pattern: /(\b(?:for|select)\s+)\w+(?=\s+in\s)/,
			alias: 'variable',
			lookbehind: true
		},
		// Highlight variable names as variables in the left-hand part
		// of assignments (“=” and “+=”).
		'assign-left': {
			pattern: /(^|[\s;|&]|[<>]\()\w+(?:\.\w+)*(?=\+?=)/,
			inside: {
				'environment': {
					pattern: RegExp('(^|[\\s;|&]|[<>]\\()' + envVars),
					lookbehind: true,
					alias: 'constant'
				}
			},
			alias: 'variable',
			lookbehind: true
		},
		// Highlight parameter names as variables
		'parameter': {
			pattern: /(^|\s)-{1,2}(?:\w+:[+-]?)?\w+(?:\.\w+)*(?=[=\s]|$)/,
			alias: 'variable',
			lookbehind: true
		},
		'string': [
			// Support for Here-documents https://en.wikipedia.org/wiki/Here_document
			{
				pattern: /((?:^|[^<])<<-?\s*)(\w+)\s[\s\S]*?(?:\r?\n|\r)\2/,
				lookbehind: true,
				greedy: true,
				inside: insideString
			},
			// Here-document with quotes around the tag
			// → No expansion (so no “inside”).
			{
				pattern: /((?:^|[^<])<<-?\s*)(["'])(\w+)\2\s[\s\S]*?(?:\r?\n|\r)\3/,
				lookbehind: true,
				greedy: true,
				inside: {
					'bash': commandAfterHeredoc
				}
			},
			// “Normal” string
			{
				// https://www.gnu.org/software/bash/manual/html_node/Double-Quotes.html
				pattern: /(^|[^\\](?:\\\\)*)"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/,
				lookbehind: true,
				greedy: true,
				inside: insideString
			},
			{
				// https://www.gnu.org/software/bash/manual/html_node/Single-Quotes.html
				pattern: /(^|[^$\\])'[^']*'/,
				lookbehind: true,
				greedy: true
			},
			{
				// https://www.gnu.org/software/bash/manual/html_node/ANSI_002dC-Quoting.html
				pattern: /\$'(?:[^'\\]|\\[\s\S])*'/,
				greedy: true,
				inside: {
					'entity': insideString.entity
				}
			}
		],
		'environment': {
			pattern: RegExp('\\$?' + envVars),
			alias: 'constant'
		},
		'variable': insideString.variable,
		'function': {
			pattern: /(^|[\s;|&]|[<>]\()(?:add|apropos|apt|apt-cache|apt-get|aptitude|aspell|automysqlbackup|awk|basename|bash|bc|bconsole|bg|bzip2|cal|cargo|cat|cfdisk|chgrp|chkconfig|chmod|chown|chroot|cksum|clear|cmp|column|comm|composer|cp|cron|crontab|csplit|curl|cut|date|dc|dd|ddrescue|debootstrap|df|diff|diff3|dig|dir|dircolors|dirname|dirs|dmesg|docker|docker-compose|du|egrep|eject|env|ethtool|expand|expect|expr|fdformat|fdisk|fg|fgrep|file|find|fmt|fold|format|free|fsck|ftp|fuser|gawk|git|gparted|grep|groupadd|groupdel|groupmod|groups|grub-mkconfig|gzip|halt|head|hg|history|host|hostname|htop|iconv|id|ifconfig|ifdown|ifup|import|install|ip|java|jobs|join|kill|killall|less|link|ln|locate|logname|logrotate|look|lpc|lpr|lprint|lprintd|lprintq|lprm|ls|lsof|lynx|make|man|mc|mdadm|mkconfig|mkdir|mke2fs|mkfifo|mkfs|mkisofs|mknod|mkswap|mmv|more|most|mount|mtools|mtr|mutt|mv|nano|nc|netstat|nice|nl|node|nohup|notify-send|npm|nslookup|op|open|parted|passwd|paste|pathchk|ping|pkill|pnpm|podman|podman-compose|popd|pr|printcap|printenv|ps|pushd|pv|quota|quotacheck|quotactl|ram|rar|rcp|reboot|remsync|rename|renice|rev|rm|rmdir|rpm|rsync|scp|screen|sdiff|sed|sendmail|seq|service|sftp|sh|shellcheck|shuf|shutdown|sleep|slocate|sort|split|ssh|stat|strace|su|sudo|sum|suspend|swapon|sync|sysctl|tac|tail|tar|tee|time|timeout|top|touch|tr|traceroute|tsort|tty|umount|uname|unexpand|uniq|units|unrar|unshar|unzip|update-grub|uptime|useradd|userdel|usermod|users|uudecode|uuencode|v|vcpkg|vdir|vi|vim|virsh|vmstat|wait|watch|wc|wget|whereis|which|who|whoami|write|xargs|xdg-open|yarn|yes|zenity|zip|zsh|zypper)(?=$|[)\s;|&])/,
			lookbehind: true
		},
		'keyword': {
			pattern: /(^|[\s;|&]|[<>]\()(?:case|do|done|elif|else|esac|fi|for|function|if|in|select|then|until|while)(?=$|[)\s;|&])/,
			lookbehind: true
		},
		// https://www.gnu.org/software/bash/manual/html_node/Shell-Builtin-Commands.html
		'builtin': {
			pattern: /(^|[\s;|&]|[<>]\()(?:\.|:|alias|bind|break|builtin|caller|cd|command|continue|declare|echo|enable|eval|exec|exit|export|getopts|hash|help|let|local|logout|mapfile|printf|pwd|read|readarray|readonly|return|set|shift|shopt|source|test|times|trap|type|typeset|ulimit|umask|unalias|unset)(?=$|[)\s;|&])/,
			lookbehind: true,
			// Alias added to make those easier to distinguish from strings.
			alias: 'class-name'
		},
		'boolean': {
			pattern: /(^|[\s;|&]|[<>]\()(?:false|true)(?=$|[)\s;|&])/,
			lookbehind: true
		},
		'file-descriptor': {
			pattern: /\B&\d\b/,
			alias: 'important'
		},
		'operator': {
			// Lots of redirections here, but not just that.
			pattern: /\d?<>|>\||\+=|=[=~]?|!=?|<<[<-]?|[&\d]?>>|\d[<>]&?|[<>][&=]?|&[>&]?|\|[&|]?/,
			inside: {
				'file-descriptor': {
					pattern: /^\d/,
					alias: 'important'
				}
			}
		},
		'punctuation': /\$?\(\(?|\)\)?|\.\.|[{}[\];\\]/,
		'number': {
			pattern: /(^|\s)(?:[1-9]\d*|0)(?:[.,]\d+)?\b/,
			lookbehind: true
		}
	};

	commandAfterHeredoc.inside = Prism.languages.bash;

	/* Patterns in command substitution. */
	var toBeCopied = [
		'comment',
		'function-name',
		'for-or-select',
		'assign-left',
		'parameter',
		'string',
		'environment',
		'function',
		'keyword',
		'builtin',
		'boolean',
		'file-descriptor',
		'operator',
		'punctuation',
		'number'
	];
	var inside = insideString.variable[1].inside;
	for (var i = 0; i < toBeCopied.length; i++) {
		inside[toBeCopied[i]] = Prism.languages.bash[toBeCopied[i]];
	}

	Prism.languages.sh = Prism.languages.bash;
	Prism.languages.shell = Prism.languages.bash;
}(Prism));

Prism.languages.c = Prism.languages.extend('clike', {
	'comment': {
		pattern: /\/\/(?:[^\r\n\\]|\\(?:\r\n?|\n|(?![\r\n])))*|\/\*[\s\S]*?(?:\*\/|$)/,
		greedy: true
	},
	'string': {
		// https://en.cppreference.com/w/c/language/string_literal
		pattern: /"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"/,
		greedy: true
	},
	'class-name': {
		pattern: /(\b(?:enum|struct)\s+(?:__attribute__\s*\(\([\s\S]*?\)\)\s*)?)\w+|\b[a-z]\w*_t\b/,
		lookbehind: true
	},
	'keyword': /\b(?:_Alignas|_Alignof|_Atomic|_Bool|_Complex|_Generic|_Imaginary|_Noreturn|_Static_assert|_Thread_local|__attribute__|asm|auto|break|case|char|const|continue|default|do|double|else|enum|extern|float|for|goto|if|inline|int|long|register|return|short|signed|sizeof|static|struct|switch|typedef|typeof|union|unsigned|void|volatile|while)\b/,
	'function': /\b[a-z_]\w*(?=\s*\()/i,
	'number': /(?:\b0x(?:[\da-f]+(?:\.[\da-f]*)?|\.[\da-f]+)(?:p[+-]?\d+)?|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?)[ful]{0,4}/i,
	'operator': />>=?|<<=?|->|([-+&|:])\1|[?:~]|[-+*/%&|^!=<>]=?/
});

Prism.languages.insertBefore('c', 'string', {
	'char': {
		// https://en.cppreference.com/w/c/language/character_constant
		pattern: /'(?:\\(?:\r\n|[\s\S])|[^'\\\r\n]){0,32}'/,
		greedy: true
	}
});

Prism.languages.insertBefore('c', 'string', {
	'macro': {
		// allow for multiline macro definitions
		// spaces after the # character compile fine with gcc
		pattern: /(^[\t ]*)#\s*[a-z](?:[^\r\n\\/]|\/(?!\*)|\/\*(?:[^*]|\*(?!\/))*\*\/|\\(?:\r\n|[\s\S]))*/im,
		lookbehind: true,
		greedy: true,
		alias: 'property',
		inside: {
			'string': [
				{
					// highlight the path of the include statement as a string
					pattern: /^(#\s*include\s*)<[^>]+>/,
					lookbehind: true
				},
				Prism.languages.c['string']
			],
			'char': Prism.languages.c['char'],
			'comment': Prism.languages.c['comment'],
			'macro-name': [
				{
					pattern: /(^#\s*define\s+)\w+\b(?!\()/i,
					lookbehind: true
				},
				{
					pattern: /(^#\s*define\s+)\w+\b(?=\()/i,
					lookbehind: true,
					alias: 'function'
				}
			],
			// highlight macro directives as keywords
			'directive': {
				pattern: /^(#\s*)[a-z]+/,
				lookbehind: true,
				alias: 'keyword'
			},
			'directive-hash': /^#/,
			'punctuation': /##|\\(?=[\r\n])/,
			'expression': {
				pattern: /\S[\s\S]*/,
				inside: Prism.languages.c
			}
		}
	}
});

Prism.languages.insertBefore('c', 'function', {
	// highlight predefined macros as constants
	'constant': /\b(?:EOF|NULL|SEEK_CUR|SEEK_END|SEEK_SET|__DATE__|__FILE__|__LINE__|__TIMESTAMP__|__TIME__|__func__|stderr|stdin|stdout)\b/
});

delete Prism.languages.c['boolean'];

(function (Prism) {

	var keyword = /\b(?:alignas|alignof|asm|auto|bool|break|case|catch|char|char16_t|char32_t|char8_t|class|co_await|co_return|co_yield|compl|concept|const|const_cast|consteval|constexpr|constinit|continue|decltype|default|delete|do|double|dynamic_cast|else|enum|explicit|export|extern|final|float|for|friend|goto|if|import|inline|int|int16_t|int32_t|int64_t|int8_t|long|module|mutable|namespace|new|noexcept|nullptr|operator|override|private|protected|public|register|reinterpret_cast|requires|return|short|signed|sizeof|static|static_assert|static_cast|struct|switch|template|this|thread_local|throw|try|typedef|typeid|typename|uint16_t|uint32_t|uint64_t|uint8_t|union|unsigned|using|virtual|void|volatile|wchar_t|while)\b/;
	var modName = /\b(?!<keyword>)\w+(?:\s*\.\s*\w+)*\b/.source.replace(/<keyword>/g, function () { return keyword.source; });

	Prism.languages.cpp = Prism.languages.extend('c', {
		'class-name': [
			{
				pattern: RegExp(/(\b(?:class|concept|enum|struct|typename)\s+)(?!<keyword>)\w+/.source
					.replace(/<keyword>/g, function () { return keyword.source; })),
				lookbehind: true
			},
			// This is intended to capture the class name of method implementations like:
			//   void foo::bar() const {}
			// However! The `foo` in the above example could also be a namespace, so we only capture the class name if
			// it starts with an uppercase letter. This approximation should give decent results.
			/\b[A-Z]\w*(?=\s*::\s*\w+\s*\()/,
			// This will capture the class name before destructors like:
			//   Foo::~Foo() {}
			/\b[A-Z_]\w*(?=\s*::\s*~\w+\s*\()/i,
			// This also intends to capture the class name of method implementations but here the class has template
			// parameters, so it can't be a namespace (until C++ adds generic namespaces).
			/\b\w+(?=\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>\s*::\s*\w+\s*\()/
		],
		'keyword': keyword,
		'number': {
			pattern: /(?:\b0b[01']+|\b0x(?:[\da-f']+(?:\.[\da-f']*)?|\.[\da-f']+)(?:p[+-]?[\d']+)?|(?:\b[\d']+(?:\.[\d']*)?|\B\.[\d']+)(?:e[+-]?[\d']+)?)[ful]{0,4}/i,
			greedy: true
		},
		'operator': />>=?|<<=?|->|--|\+\+|&&|\|\||[?:~]|<=>|[-+*/%&|^!=<>]=?|\b(?:and|and_eq|bitand|bitor|not|not_eq|or|or_eq|xor|xor_eq)\b/,
		'boolean': /\b(?:false|true)\b/
	});

	Prism.languages.insertBefore('cpp', 'string', {
		'module': {
			// https://en.cppreference.com/w/cpp/language/modules
			pattern: RegExp(
				/(\b(?:import|module)\s+)/.source +
				'(?:' +
				// header-name
				/"(?:\\(?:\r\n|[\s\S])|[^"\\\r\n])*"|<[^<>\r\n]*>/.source +
				'|' +
				// module name or partition or both
				/<mod-name>(?:\s*:\s*<mod-name>)?|:\s*<mod-name>/.source.replace(/<mod-name>/g, function () { return modName; }) +
				')'
			),
			lookbehind: true,
			greedy: true,
			inside: {
				'string': /^[<"][\s\S]+/,
				'operator': /:/,
				'punctuation': /\./
			}
		},
		'raw-string': {
			pattern: /R"([^()\\ ]{0,16})\([\s\S]*?\)\1"/,
			alias: 'string',
			greedy: true
		}
	});

	Prism.languages.insertBefore('cpp', 'keyword', {
		'generic-function': {
			pattern: /\b(?!operator\b)[a-z_]\w*\s*<(?:[^<>]|<[^<>]*>)*>(?=\s*\()/i,
			inside: {
				'function': /^\w+/,
				'generic': {
					pattern: /<[\s\S]+/,
					alias: 'class-name',
					inside: Prism.languages.cpp
				}
			}
		}
	});

	Prism.languages.insertBefore('cpp', 'operator', {
		'double-colon': {
			pattern: /::/,
			alias: 'punctuation'
		}
	});

	Prism.languages.insertBefore('cpp', 'class-name', {
		// the base clause is an optional list of parent classes
		// https://en.cppreference.com/w/cpp/language/class
		'base-clause': {
			pattern: /(\b(?:class|struct)\s+\w+\s*:\s*)[^;{}"'\s]+(?:\s+[^;{}"'\s]+)*(?=\s*[;{])/,
			lookbehind: true,
			greedy: true,
			inside: Prism.languages.extend('cpp', {})
		}
	});

	Prism.languages.insertBefore('inside', 'double-colon', {
		// All untokenized words that are not namespaces should be class names
		'class-name': /\b[a-z_]\w*\b(?!\s*::)/i
	}, Prism.languages.cpp['base-clause']);

}(Prism));

Prism.languages.cmake = {
	'comment': /#.*/,
	'string': {
		pattern: /"(?:[^\\"]|\\.)*"/,
		greedy: true,
		inside: {
			'interpolation': {
				pattern: /\$\{(?:[^{}$]|\$\{[^{}$]*\})*\}/,
				inside: {
					'punctuation': /\$\{|\}/,
					'variable': /\w+/
				}
			}
		}
	},
	'variable': /\b(?:CMAKE_\w+|\w+_(?:(?:BINARY|SOURCE)_DIR|DESCRIPTION|HOMEPAGE_URL|ROOT|VERSION(?:_MAJOR|_MINOR|_PATCH|_TWEAK)?)|(?:ANDROID|APPLE|BORLAND|BUILD_SHARED_LIBS|CACHE|CPACK_(?:ABSOLUTE_DESTINATION_FILES|COMPONENT_INCLUDE_TOPLEVEL_DIRECTORY|ERROR_ON_ABSOLUTE_INSTALL_DESTINATION|INCLUDE_TOPLEVEL_DIRECTORY|INSTALL_DEFAULT_DIRECTORY_PERMISSIONS|INSTALL_SCRIPT|PACKAGING_INSTALL_PREFIX|SET_DESTDIR|WARN_ON_ABSOLUTE_INSTALL_DESTINATION)|CTEST_(?:BINARY_DIRECTORY|BUILD_COMMAND|BUILD_NAME|BZR_COMMAND|BZR_UPDATE_OPTIONS|CHANGE_ID|CHECKOUT_COMMAND|CONFIGURATION_TYPE|CONFIGURE_COMMAND|COVERAGE_COMMAND|COVERAGE_EXTRA_FLAGS|CURL_OPTIONS|CUSTOM_(?:COVERAGE_EXCLUDE|ERROR_EXCEPTION|ERROR_MATCH|ERROR_POST_CONTEXT|ERROR_PRE_CONTEXT|MAXIMUM_FAILED_TEST_OUTPUT_SIZE|MAXIMUM_NUMBER_OF_(?:ERRORS|WARNINGS)|MAXIMUM_PASSED_TEST_OUTPUT_SIZE|MEMCHECK_IGNORE|POST_MEMCHECK|POST_TEST|PRE_MEMCHECK|PRE_TEST|TESTS_IGNORE|WARNING_EXCEPTION|WARNING_MATCH)|CVS_CHECKOUT|CVS_COMMAND|CVS_UPDATE_OPTIONS|DROP_LOCATION|DROP_METHOD|DROP_SITE|DROP_SITE_CDASH|DROP_SITE_PASSWORD|DROP_SITE_USER|EXTRA_COVERAGE_GLOB|GIT_COMMAND|GIT_INIT_SUBMODULES|GIT_UPDATE_CUSTOM|GIT_UPDATE_OPTIONS|HG_COMMAND|HG_UPDATE_OPTIONS|LABELS_FOR_SUBPROJECTS|MEMORYCHECK_(?:COMMAND|COMMAND_OPTIONS|SANITIZER_OPTIONS|SUPPRESSIONS_FILE|TYPE)|NIGHTLY_START_TIME|P4_CLIENT|P4_COMMAND|P4_OPTIONS|P4_UPDATE_OPTIONS|RUN_CURRENT_SCRIPT|SCP_COMMAND|SITE|SOURCE_DIRECTORY|SUBMIT_URL|SVN_COMMAND|SVN_OPTIONS|SVN_UPDATE_OPTIONS|TEST_LOAD|TEST_TIMEOUT|TRIGGER_SITE|UPDATE_COMMAND|UPDATE_OPTIONS|UPDATE_VERSION_ONLY|USE_LAUNCHERS)|CYGWIN|ENV|EXECUTABLE_OUTPUT_PATH|GHS-MULTI|IOS|LIBRARY_OUTPUT_PATH|MINGW|MSVC(?:10|11|12|14|60|70|71|80|90|_IDE|_TOOLSET_VERSION|_VERSION)?|MSYS|PROJECT_NAME|UNIX|WIN32|WINCE|WINDOWS_PHONE|WINDOWS_STORE|XCODE))\b/,
	'property': /\b(?:cxx_\w+|(?:ARCHIVE_OUTPUT_(?:DIRECTORY|NAME)|COMPILE_DEFINITIONS|COMPILE_PDB_NAME|COMPILE_PDB_OUTPUT_DIRECTORY|EXCLUDE_FROM_DEFAULT_BUILD|IMPORTED_(?:IMPLIB|LIBNAME|LINK_DEPENDENT_LIBRARIES|LINK_INTERFACE_LANGUAGES|LINK_INTERFACE_LIBRARIES|LINK_INTERFACE_MULTIPLICITY|LOCATION|NO_SONAME|OBJECTS|SONAME)|INTERPROCEDURAL_OPTIMIZATION|LIBRARY_OUTPUT_DIRECTORY|LIBRARY_OUTPUT_NAME|LINK_FLAGS|LINK_INTERFACE_LIBRARIES|LINK_INTERFACE_MULTIPLICITY|LOCATION|MAP_IMPORTED_CONFIG|OSX_ARCHITECTURES|OUTPUT_NAME|PDB_NAME|PDB_OUTPUT_DIRECTORY|RUNTIME_OUTPUT_DIRECTORY|RUNTIME_OUTPUT_NAME|STATIC_LIBRARY_FLAGS|VS_CSHARP|VS_DOTNET_REFERENCEPROP|VS_DOTNET_REFERENCE|VS_GLOBAL_SECTION_POST|VS_GLOBAL_SECTION_PRE|VS_GLOBAL|XCODE_ATTRIBUTE)_\w+|\w+_(?:CLANG_TIDY|COMPILER_LAUNCHER|CPPCHECK|CPPLINT|INCLUDE_WHAT_YOU_USE|OUTPUT_NAME|POSTFIX|VISIBILITY_PRESET)|ABSTRACT|ADDITIONAL_MAKE_CLEAN_FILES|ADVANCED|ALIASED_TARGET|ALLOW_DUPLICATE_CUSTOM_TARGETS|ANDROID_(?:ANT_ADDITIONAL_OPTIONS|API|API_MIN|ARCH|ASSETS_DIRECTORIES|GUI|JAR_DEPENDENCIES|NATIVE_LIB_DEPENDENCIES|NATIVE_LIB_DIRECTORIES|PROCESS_MAX|PROGUARD|PROGUARD_CONFIG_PATH|SECURE_PROPS_PATH|SKIP_ANT_STEP|STL_TYPE)|ARCHIVE_OUTPUT_DIRECTORY|ATTACHED_FILES|ATTACHED_FILES_ON_FAIL|AUTOGEN_(?:BUILD_DIR|ORIGIN_DEPENDS|PARALLEL|SOURCE_GROUP|TARGETS_FOLDER|TARGET_DEPENDS)|AUTOMOC|AUTOMOC_(?:COMPILER_PREDEFINES|DEPEND_FILTERS|EXECUTABLE|MACRO_NAMES|MOC_OPTIONS|SOURCE_GROUP|TARGETS_FOLDER)|AUTORCC|AUTORCC_EXECUTABLE|AUTORCC_OPTIONS|AUTORCC_SOURCE_GROUP|AUTOUIC|AUTOUIC_EXECUTABLE|AUTOUIC_OPTIONS|AUTOUIC_SEARCH_PATHS|BINARY_DIR|BUILDSYSTEM_TARGETS|BUILD_RPATH|BUILD_RPATH_USE_ORIGIN|BUILD_WITH_INSTALL_NAME_DIR|BUILD_WITH_INSTALL_RPATH|BUNDLE|BUNDLE_EXTENSION|CACHE_VARIABLES|CLEAN_NO_CUSTOM|COMMON_LANGUAGE_RUNTIME|COMPATIBLE_INTERFACE_(?:BOOL|NUMBER_MAX|NUMBER_MIN|STRING)|COMPILE_(?:DEFINITIONS|FEATURES|FLAGS|OPTIONS|PDB_NAME|PDB_OUTPUT_DIRECTORY)|COST|CPACK_DESKTOP_SHORTCUTS|CPACK_NEVER_OVERWRITE|CPACK_PERMANENT|CPACK_STARTUP_SHORTCUTS|CPACK_START_MENU_SHORTCUTS|CPACK_WIX_ACL|CROSSCOMPILING_EMULATOR|CUDA_EXTENSIONS|CUDA_PTX_COMPILATION|CUDA_RESOLVE_DEVICE_SYMBOLS|CUDA_SEPARABLE_COMPILATION|CUDA_STANDARD|CUDA_STANDARD_REQUIRED|CXX_EXTENSIONS|CXX_STANDARD|CXX_STANDARD_REQUIRED|C_EXTENSIONS|C_STANDARD|C_STANDARD_REQUIRED|DEBUG_CONFIGURATIONS|DEFINE_SYMBOL|DEFINITIONS|DEPENDS|DEPLOYMENT_ADDITIONAL_FILES|DEPLOYMENT_REMOTE_DIRECTORY|DISABLED|DISABLED_FEATURES|ECLIPSE_EXTRA_CPROJECT_CONTENTS|ECLIPSE_EXTRA_NATURES|ENABLED_FEATURES|ENABLED_LANGUAGES|ENABLE_EXPORTS|ENVIRONMENT|EXCLUDE_FROM_ALL|EXCLUDE_FROM_DEFAULT_BUILD|EXPORT_NAME|EXPORT_PROPERTIES|EXTERNAL_OBJECT|EchoString|FAIL_REGULAR_EXPRESSION|FIND_LIBRARY_USE_LIB32_PATHS|FIND_LIBRARY_USE_LIB64_PATHS|FIND_LIBRARY_USE_LIBX32_PATHS|FIND_LIBRARY_USE_OPENBSD_VERSIONING|FIXTURES_CLEANUP|FIXTURES_REQUIRED|FIXTURES_SETUP|FOLDER|FRAMEWORK|Fortran_FORMAT|Fortran_MODULE_DIRECTORY|GENERATED|GENERATOR_FILE_NAME|GENERATOR_IS_MULTI_CONFIG|GHS_INTEGRITY_APP|GHS_NO_SOURCE_GROUP_FILE|GLOBAL_DEPENDS_DEBUG_MODE|GLOBAL_DEPENDS_NO_CYCLES|GNUtoMS|HAS_CXX|HEADER_FILE_ONLY|HELPSTRING|IMPLICIT_DEPENDS_INCLUDE_TRANSFORM|IMPORTED|IMPORTED_(?:COMMON_LANGUAGE_RUNTIME|CONFIGURATIONS|GLOBAL|IMPLIB|LIBNAME|LINK_DEPENDENT_LIBRARIES|LINK_INTERFACE_(?:LANGUAGES|LIBRARIES|MULTIPLICITY)|LOCATION|NO_SONAME|OBJECTS|SONAME)|IMPORT_PREFIX|IMPORT_SUFFIX|INCLUDE_DIRECTORIES|INCLUDE_REGULAR_EXPRESSION|INSTALL_NAME_DIR|INSTALL_RPATH|INSTALL_RPATH_USE_LINK_PATH|INTERFACE_(?:AUTOUIC_OPTIONS|COMPILE_DEFINITIONS|COMPILE_FEATURES|COMPILE_OPTIONS|INCLUDE_DIRECTORIES|LINK_DEPENDS|LINK_DIRECTORIES|LINK_LIBRARIES|LINK_OPTIONS|POSITION_INDEPENDENT_CODE|SOURCES|SYSTEM_INCLUDE_DIRECTORIES)|INTERPROCEDURAL_OPTIMIZATION|IN_TRY_COMPILE|IOS_INSTALL_COMBINED|JOB_POOLS|JOB_POOL_COMPILE|JOB_POOL_LINK|KEEP_EXTENSION|LABELS|LANGUAGE|LIBRARY_OUTPUT_DIRECTORY|LINKER_LANGUAGE|LINK_(?:DEPENDS|DEPENDS_NO_SHARED|DIRECTORIES|FLAGS|INTERFACE_LIBRARIES|INTERFACE_MULTIPLICITY|LIBRARIES|OPTIONS|SEARCH_END_STATIC|SEARCH_START_STATIC|WHAT_YOU_USE)|LISTFILE_STACK|LOCATION|MACOSX_BUNDLE|MACOSX_BUNDLE_INFO_PLIST|MACOSX_FRAMEWORK_INFO_PLIST|MACOSX_PACKAGE_LOCATION|MACOSX_RPATH|MACROS|MANUALLY_ADDED_DEPENDENCIES|MEASUREMENT|MODIFIED|NAME|NO_SONAME|NO_SYSTEM_FROM_IMPORTED|OBJECT_DEPENDS|OBJECT_OUTPUTS|OSX_ARCHITECTURES|OUTPUT_NAME|PACKAGES_FOUND|PACKAGES_NOT_FOUND|PARENT_DIRECTORY|PASS_REGULAR_EXPRESSION|PDB_NAME|PDB_OUTPUT_DIRECTORY|POSITION_INDEPENDENT_CODE|POST_INSTALL_SCRIPT|PREDEFINED_TARGETS_FOLDER|PREFIX|PRE_INSTALL_SCRIPT|PRIVATE_HEADER|PROCESSORS|PROCESSOR_AFFINITY|PROJECT_LABEL|PUBLIC_HEADER|REPORT_UNDEFINED_PROPERTIES|REQUIRED_FILES|RESOURCE|RESOURCE_LOCK|RULE_LAUNCH_COMPILE|RULE_LAUNCH_CUSTOM|RULE_LAUNCH_LINK|RULE_MESSAGES|RUNTIME_OUTPUT_DIRECTORY|RUN_SERIAL|SKIP_AUTOGEN|SKIP_AUTOMOC|SKIP_AUTORCC|SKIP_AUTOUIC|SKIP_BUILD_RPATH|SKIP_RETURN_CODE|SOURCES|SOURCE_DIR|SOVERSION|STATIC_LIBRARY_FLAGS|STATIC_LIBRARY_OPTIONS|STRINGS|SUBDIRECTORIES|SUFFIX|SYMBOLIC|TARGET_ARCHIVES_MAY_BE_SHARED_LIBS|TARGET_MESSAGES|TARGET_SUPPORTS_SHARED_LIBS|TESTS|TEST_INCLUDE_FILE|TEST_INCLUDE_FILES|TIMEOUT|TIMEOUT_AFTER_MATCH|TYPE|USE_FOLDERS|VALUE|VARIABLES|VERSION|VISIBILITY_INLINES_HIDDEN|VS_(?:CONFIGURATION_TYPE|COPY_TO_OUT_DIR|DEBUGGER_(?:COMMAND|COMMAND_ARGUMENTS|ENVIRONMENT|WORKING_DIRECTORY)|DEPLOYMENT_CONTENT|DEPLOYMENT_LOCATION|DOTNET_REFERENCES|DOTNET_REFERENCES_COPY_LOCAL|INCLUDE_IN_VSIX|IOT_STARTUP_TASK|KEYWORD|RESOURCE_GENERATOR|SCC_AUXPATH|SCC_LOCALPATH|SCC_PROJECTNAME|SCC_PROVIDER|SDK_REFERENCES|SHADER_(?:DISABLE_OPTIMIZATIONS|ENABLE_DEBUG|ENTRYPOINT|FLAGS|MODEL|OBJECT_FILE_NAME|OUTPUT_HEADER_FILE|TYPE|VARIABLE_NAME)|STARTUP_PROJECT|TOOL_OVERRIDE|USER_PROPS|WINRT_COMPONENT|WINRT_EXTENSIONS|WINRT_REFERENCES|XAML_TYPE)|WILL_FAIL|WIN32_EXECUTABLE|WINDOWS_EXPORT_ALL_SYMBOLS|WORKING_DIRECTORY|WRAP_EXCLUDE|XCODE_(?:EMIT_EFFECTIVE_PLATFORM_NAME|EXPLICIT_FILE_TYPE|FILE_ATTRIBUTES|LAST_KNOWN_FILE_TYPE|PRODUCT_TYPE|SCHEME_(?:ADDRESS_SANITIZER|ADDRESS_SANITIZER_USE_AFTER_RETURN|ARGUMENTS|DISABLE_MAIN_THREAD_CHECKER|DYNAMIC_LIBRARY_LOADS|DYNAMIC_LINKER_API_USAGE|ENVIRONMENT|EXECUTABLE|GUARD_MALLOC|MAIN_THREAD_CHECKER_STOP|MALLOC_GUARD_EDGES|MALLOC_SCRIBBLE|MALLOC_STACK|THREAD_SANITIZER(?:_STOP)?|UNDEFINED_BEHAVIOUR_SANITIZER(?:_STOP)?|ZOMBIE_OBJECTS))|XCTEST)\b/,
	'keyword': /\b(?:add_compile_definitions|add_compile_options|add_custom_command|add_custom_target|add_definitions|add_dependencies|add_executable|add_library|add_link_options|add_subdirectory|add_test|aux_source_directory|break|build_command|build_name|cmake_host_system_information|cmake_minimum_required|cmake_parse_arguments|cmake_policy|configure_file|continue|create_test_sourcelist|ctest_build|ctest_configure|ctest_coverage|ctest_empty_binary_directory|ctest_memcheck|ctest_read_custom_files|ctest_run_script|ctest_sleep|ctest_start|ctest_submit|ctest_test|ctest_update|ctest_upload|define_property|else|elseif|enable_language|enable_testing|endforeach|endfunction|endif|endmacro|endwhile|exec_program|execute_process|export|export_library_dependencies|file|find_file|find_library|find_package|find_path|find_program|fltk_wrap_ui|foreach|function|get_cmake_property|get_directory_property|get_filename_component|get_property|get_source_file_property|get_target_property|get_test_property|if|include|include_directories|include_external_msproject|include_guard|include_regular_expression|install|install_files|install_programs|install_targets|link_directories|link_libraries|list|load_cache|load_command|macro|make_directory|mark_as_advanced|math|message|option|output_required_files|project|qt_wrap_cpp|qt_wrap_ui|remove|remove_definitions|return|separate_arguments|set|set_directory_properties|set_property|set_source_files_properties|set_target_properties|set_tests_properties|site_name|source_group|string|subdir_depends|subdirs|target_compile_definitions|target_compile_features|target_compile_options|target_include_directories|target_link_directories|target_link_libraries|target_link_options|target_sources|try_compile|try_run|unset|use_mangled_mesa|utility_source|variable_requires|variable_watch|while|write_file)(?=\s*\()\b/,
	'boolean': /\b(?:FALSE|OFF|ON|TRUE)\b/,
	'namespace': /\b(?:INTERFACE|PRIVATE|PROPERTIES|PUBLIC|SHARED|STATIC|TARGET_OBJECTS)\b/,
	'operator': /\b(?:AND|DEFINED|EQUAL|GREATER|LESS|MATCHES|NOT|OR|STREQUAL|STRGREATER|STRLESS|VERSION_EQUAL|VERSION_GREATER|VERSION_LESS)\b/,
	'inserted': {
		pattern: /\b\w+::\w+\b/,
		alias: 'class-name'
	},
	'number': /\b\d+(?:\.\d+)*\b/,
	'function': /\b[a-z_]\w*(?=\s*\()\b/i,
	'punctuation': /[()>}]|\$[<{]/
};

(function (Prism) {

	// Ignore comments starting with { to privilege string interpolation highlighting
	var comment = /#(?!\{).+/;
	var interpolation = {
		pattern: /#\{[^}]+\}/,
		alias: 'variable'
	};

	Prism.languages.coffeescript = Prism.languages.extend('javascript', {
		'comment': comment,
		'string': [

			// Strings are multiline
			{
				pattern: /'(?:\\[\s\S]|[^\\'])*'/,
				greedy: true
			},

			{
				// Strings are multiline
				pattern: /"(?:\\[\s\S]|[^\\"])*"/,
				greedy: true,
				inside: {
					'interpolation': interpolation
				}
			}
		],
		'keyword': /\b(?:and|break|by|catch|class|continue|debugger|delete|do|each|else|extend|extends|false|finally|for|if|in|instanceof|is|isnt|let|loop|namespace|new|no|not|null|of|off|on|or|own|return|super|switch|then|this|throw|true|try|typeof|undefined|unless|until|when|while|window|with|yes|yield)\b/,
		'class-member': {
			pattern: /@(?!\d)\w+/,
			alias: 'variable'
		}
	});

	Prism.languages.insertBefore('coffeescript', 'comment', {
		'multiline-comment': {
			pattern: /###[\s\S]+?###/,
			alias: 'comment'
		},

		// Block regexp can contain comments and interpolation
		'block-regex': {
			pattern: /\/{3}[\s\S]*?\/{3}/,
			alias: 'regex',
			inside: {
				'comment': comment,
				'interpolation': interpolation
			}
		}
	});

	Prism.languages.insertBefore('coffeescript', 'string', {
		'inline-javascript': {
			pattern: /`(?:\\[\s\S]|[^\\`])*`/,
			inside: {
				'delimiter': {
					pattern: /^`|`$/,
					alias: 'punctuation'
				},
				'script': {
					pattern: /[\s\S]+/,
					alias: 'language-javascript',
					inside: Prism.languages.javascript
				}
			}
		},

		// Block strings
		'multiline-string': [
			{
				pattern: /'''[\s\S]*?'''/,
				greedy: true,
				alias: 'string'
			},
			{
				pattern: /"""[\s\S]*?"""/,
				greedy: true,
				alias: 'string',
				inside: {
					interpolation: interpolation
				}
			}
		]

	});

	Prism.languages.insertBefore('coffeescript', 'keyword', {
		// Object property
		'property': /(?!\d)\w+(?=\s*:(?!:))/
	});

	delete Prism.languages.coffeescript['template-string'];

	Prism.languages.coffee = Prism.languages.coffeescript;
}(Prism));

/**
 * Original by Samuel Flores
 *
 * Adds the following new token classes:
 *     constant, builtin, variable, symbol, regex
 */
(function (Prism) {
	Prism.languages.ruby = Prism.languages.extend('clike', {
		'comment': {
			pattern: /#.*|^=begin\s[\s\S]*?^=end/m,
			greedy: true
		},
		'class-name': {
			pattern: /(\b(?:class|module)\s+|\bcatch\s+\()[\w.\\]+|\b[A-Z_]\w*(?=\s*\.\s*new\b)/,
			lookbehind: true,
			inside: {
				'punctuation': /[.\\]/
			}
		},
		'keyword': /\b(?:BEGIN|END|alias|and|begin|break|case|class|def|define_method|defined|do|each|else|elsif|end|ensure|extend|for|if|in|include|module|new|next|nil|not|or|prepend|private|protected|public|raise|redo|require|rescue|retry|return|self|super|then|throw|undef|unless|until|when|while|yield)\b/,
		'operator': /\.{2,3}|&\.|===|<?=>|[!=]?~|(?:&&|\|\||<<|>>|\*\*|[+\-*/%<>!^&|=])=?|[?:]/,
		'punctuation': /[(){}[\].,;]/,
	});

	Prism.languages.insertBefore('ruby', 'operator', {
		'double-colon': {
			pattern: /::/,
			alias: 'punctuation'
		},
	});

	var interpolation = {
		pattern: /((?:^|[^\\])(?:\\{2})*)#\{(?:[^{}]|\{[^{}]*\})*\}/,
		lookbehind: true,
		inside: {
			'content': {
				pattern: /^(#\{)[\s\S]+(?=\}$)/,
				lookbehind: true,
				inside: Prism.languages.ruby
			},
			'delimiter': {
				pattern: /^#\{|\}$/,
				alias: 'punctuation'
			}
		}
	};

	delete Prism.languages.ruby.function;

	var percentExpression = '(?:' + [
		/([^a-zA-Z0-9\s{(\[<=])(?:(?!\1)[^\\]|\\[\s\S])*\1/.source,
		/\((?:[^()\\]|\\[\s\S]|\((?:[^()\\]|\\[\s\S])*\))*\)/.source,
		/\{(?:[^{}\\]|\\[\s\S]|\{(?:[^{}\\]|\\[\s\S])*\})*\}/.source,
		/\[(?:[^\[\]\\]|\\[\s\S]|\[(?:[^\[\]\\]|\\[\s\S])*\])*\]/.source,
		/<(?:[^<>\\]|\\[\s\S]|<(?:[^<>\\]|\\[\s\S])*>)*>/.source
	].join('|') + ')';

	var symbolName = /(?:"(?:\\.|[^"\\\r\n])*"|(?:\b[a-zA-Z_]\w*|[^\s\0-\x7F]+)[?!]?|\$.)/.source;

	Prism.languages.insertBefore('ruby', 'keyword', {
		'regex-literal': [
			{
				pattern: RegExp(/%r/.source + percentExpression + /[egimnosux]{0,6}/.source),
				greedy: true,
				inside: {
					'interpolation': interpolation,
					'regex': /[\s\S]+/
				}
			},
			{
				pattern: /(^|[^/])\/(?!\/)(?:\[[^\r\n\]]+\]|\\.|[^[/\\\r\n])+\/[egimnosux]{0,6}(?=\s*(?:$|[\r\n,.;})#]))/,
				lookbehind: true,
				greedy: true,
				inside: {
					'interpolation': interpolation,
					'regex': /[\s\S]+/
				}
			}
		],
		'variable': /[@$]+[a-zA-Z_]\w*(?:[?!]|\b)/,
		'symbol': [
			{
				pattern: RegExp(/(^|[^:]):/.source + symbolName),
				lookbehind: true,
				greedy: true
			},
			{
				pattern: RegExp(/([\r\n{(,][ \t]*)/.source + symbolName + /(?=:(?!:))/.source),
				lookbehind: true,
				greedy: true
			},
		],
		'method-definition': {
			pattern: /(\bdef\s+)\w+(?:\s*\.\s*\w+)?/,
			lookbehind: true,
			inside: {
				'function': /\b\w+$/,
				'keyword': /^self\b/,
				'class-name': /^\w+/,
				'punctuation': /\./
			}
		}
	});

	Prism.languages.insertBefore('ruby', 'string', {
		'string-literal': [
			{
				pattern: RegExp(/%[qQiIwWs]?/.source + percentExpression),
				greedy: true,
				inside: {
					'interpolation': interpolation,
					'string': /[\s\S]+/
				}
			},
			{
				pattern: /("|')(?:#\{[^}]+\}|#(?!\{)|\\(?:\r\n|[\s\S])|(?!\1)[^\\#\r\n])*\1/,
				greedy: true,
				inside: {
					'interpolation': interpolation,
					'string': /[\s\S]+/
				}
			},
			{
				pattern: /<<[-~]?([a-z_]\w*)[\r\n](?:.*[\r\n])*?[\t ]*\1/i,
				alias: 'heredoc-string',
				greedy: true,
				inside: {
					'delimiter': {
						pattern: /^<<[-~]?[a-z_]\w*|\b[a-z_]\w*$/i,
						inside: {
							'symbol': /\b\w+/,
							'punctuation': /^<<[-~]?/
						}
					},
					'interpolation': interpolation,
					'string': /[\s\S]+/
				}
			},
			{
				pattern: /<<[-~]?'([a-z_]\w*)'[\r\n](?:.*[\r\n])*?[\t ]*\1/i,
				alias: 'heredoc-string',
				greedy: true,
				inside: {
					'delimiter': {
						pattern: /^<<[-~]?'[a-z_]\w*'|\b[a-z_]\w*$/i,
						inside: {
							'symbol': /\b\w+/,
							'punctuation': /^<<[-~]?'|'$/,
						}
					},
					'string': /[\s\S]+/
				}
			}
		],
		'command-literal': [
			{
				pattern: RegExp(/%x/.source + percentExpression),
				greedy: true,
				inside: {
					'interpolation': interpolation,
					'command': {
						pattern: /[\s\S]+/,
						alias: 'string'
					}
				}
			},
			{
				pattern: /`(?:#\{[^}]+\}|#(?!\{)|\\(?:\r\n|[\s\S])|[^\\`#\r\n])*`/,
				greedy: true,
				inside: {
					'interpolation': interpolation,
					'command': {
						pattern: /[\s\S]+/,
						alias: 'string'
					}
				}
			}
		]
	});

	delete Prism.languages.ruby.string;

	Prism.languages.insertBefore('ruby', 'number', {
		'builtin': /\b(?:Array|Bignum|Binding|Class|Continuation|Dir|Exception|FalseClass|File|Fixnum|Float|Hash|IO|Integer|MatchData|Method|Module|NilClass|Numeric|Object|Proc|Range|Regexp|Stat|String|Struct|Symbol|TMS|Thread|ThreadGroup|Time|TrueClass)\b/,
		'constant': /\b[A-Z][A-Z0-9_]*(?:[?!]|\b)/
	});

	Prism.languages.rb = Prism.languages.ruby;
}(Prism));

(function (Prism) {
	Prism.languages.crystal = Prism.languages.extend('ruby', {
		'keyword': [
			/\b(?:__DIR__|__END_LINE__|__FILE__|__LINE__|abstract|alias|annotation|as|asm|begin|break|case|class|def|do|else|elsif|end|ensure|enum|extend|for|fun|if|ifdef|include|instance_sizeof|lib|macro|module|next|of|out|pointerof|private|protected|ptr|require|rescue|return|select|self|sizeof|struct|super|then|type|typeof|undef|uninitialized|union|unless|until|when|while|with|yield)\b/,
			{
				pattern: /(\.\s*)(?:is_a|responds_to)\?/,
				lookbehind: true
			}
		],
		'number': /\b(?:0b[01_]*[01]|0o[0-7_]*[0-7]|0x[\da-fA-F_]*[\da-fA-F]|(?:\d(?:[\d_]*\d)?)(?:\.[\d_]*\d)?(?:[eE][+-]?[\d_]*\d)?)(?:_(?:[uif](?:8|16|32|64))?)?\b/,
		'operator': [
			/->/,
			Prism.languages.ruby.operator,
		],
		'punctuation': /[(){}[\].,;\\]/,
	});

	Prism.languages.insertBefore('crystal', 'string-literal', {
		'attribute': {
			pattern: /@\[.*?\]/,
			inside: {
				'delimiter': {
					pattern: /^@\[|\]$/,
					alias: 'punctuation'
				},
				'attribute': {
					pattern: /^(\s*)\w+/,
					lookbehind: true,
					alias: 'class-name'
				},
				'args': {
					pattern: /\S(?:[\s\S]*\S)?/,
					inside: Prism.languages.crystal
				},
			}
		},
		'expansion': {
			pattern: /\{(?:\{.*?\}|%.*?%)\}/,
			inside: {
				'content': {
					pattern: /^(\{.)[\s\S]+(?=.\}$)/,
					lookbehind: true,
					inside: Prism.languages.crystal
				},
				'delimiter': {
					pattern: /^\{[\{%]|[\}%]\}$/,
					alias: 'operator'
				}
			}
		},
		'char': {
			pattern: /'(?:[^\\\r\n]{1,2}|\\(?:.|u(?:[A-Fa-f0-9]{1,4}|\{[A-Fa-f0-9]{1,6}\})))'/,
			greedy: true
		}
	});

}(Prism));

Prism.languages.d = Prism.languages.extend('clike', {
	'comment': [
		{
			// Shebang
			pattern: /^\s*#!.+/,
			greedy: true
		},
		{
			pattern: RegExp(/(^|[^\\])/.source + '(?:' + [
				// /+ comment +/
				// Allow one level of nesting
				/\/\+(?:\/\+(?:[^+]|\+(?!\/))*\+\/|(?!\/\+)[\s\S])*?\+\//.source,
				// // comment
				/\/\/.*/.source,
				// /* comment */
				/\/\*[\s\S]*?\*\//.source
			].join('|') + ')'),
			lookbehind: true,
			greedy: true
		}
	],
	'string': [
		{
			pattern: RegExp([
				// r"", x""
				/\b[rx]"(?:\\[\s\S]|[^\\"])*"[cwd]?/.source,

				// q"[]", q"()", q"<>", q"{}"
				/\bq"(?:\[[\s\S]*?\]|\([\s\S]*?\)|<[\s\S]*?>|\{[\s\S]*?\})"/.source,

				// q"IDENT
				// ...
				// IDENT"
				/\bq"((?!\d)\w+)$[\s\S]*?^\1"/.source,

				// q"//", q"||", etc.
				// eslint-disable-next-line regexp/strict
				/\bq"(.)[\s\S]*?\2"/.source,

				// eslint-disable-next-line regexp/strict
				/(["`])(?:\\[\s\S]|(?!\3)[^\\])*\3[cwd]?/.source
			].join('|'), 'm'),
			greedy: true
		},
		{
			pattern: /\bq\{(?:\{[^{}]*\}|[^{}])*\}/,
			greedy: true,
			alias: 'token-string'
		}
	],

	// In order: $, keywords and special tokens, globally defined symbols
	'keyword': /\$|\b(?:__(?:(?:DATE|EOF|FILE|FUNCTION|LINE|MODULE|PRETTY_FUNCTION|TIMESTAMP|TIME|VENDOR|VERSION)__|gshared|parameters|traits|vector)|abstract|alias|align|asm|assert|auto|body|bool|break|byte|case|cast|catch|cdouble|cent|cfloat|char|class|const|continue|creal|dchar|debug|default|delegate|delete|deprecated|do|double|dstring|else|enum|export|extern|false|final|finally|float|for|foreach|foreach_reverse|function|goto|idouble|if|ifloat|immutable|import|inout|int|interface|invariant|ireal|lazy|long|macro|mixin|module|new|nothrow|null|out|override|package|pragma|private|protected|ptrdiff_t|public|pure|real|ref|return|scope|shared|short|size_t|static|string|struct|super|switch|synchronized|template|this|throw|true|try|typedef|typeid|typeof|ubyte|ucent|uint|ulong|union|unittest|ushort|version|void|volatile|wchar|while|with|wstring)\b/,

	'number': [
		// The lookbehind and the negative look-ahead try to prevent bad highlighting of the .. operator
		// Hexadecimal numbers must be handled separately to avoid problems with exponent "e"
		/\b0x\.?[a-f\d_]+(?:(?!\.\.)\.[a-f\d_]*)?(?:p[+-]?[a-f\d_]+)?[ulfi]{0,4}/i,
		{
			pattern: /((?:\.\.)?)(?:\b0b\.?|\b|\.)\d[\d_]*(?:(?!\.\.)\.[\d_]*)?(?:e[+-]?\d[\d_]*)?[ulfi]{0,4}/i,
			lookbehind: true
		}
	],

	'operator': /\|[|=]?|&[&=]?|\+[+=]?|-[-=]?|\.?\.\.|=[>=]?|!(?:i[ns]\b|<>?=?|>=?|=)?|\bi[ns]\b|(?:<[<>]?|>>?>?|\^\^|[*\/%^~])=?/
});

Prism.languages.insertBefore('d', 'string', {
	// Characters
	// 'a', '\\', '\n', '\xFF', '\377', '\uFFFF', '\U0010FFFF', '\quot'
	'char': /'(?:\\(?:\W|\w+)|[^\\])'/
});

Prism.languages.insertBefore('d', 'keyword', {
	'property': /\B@\w*/
});

Prism.languages.insertBefore('d', 'function', {
	'register': {
		// Iasm registers
		pattern: /\b(?:[ABCD][LHX]|E?(?:BP|DI|SI|SP)|[BS]PL|[ECSDGF]S|CR[0234]|[DS]IL|DR[012367]|E[ABCD]X|X?MM[0-7]|R(?:1[0-5]|[89])[BWD]?|R[ABCD]X|R[BS]P|R[DS]I|TR[3-7]|XMM(?:1[0-5]|[89])|YMM(?:1[0-5]|\d))\b|\bST(?:\([0-7]\)|\b)/,
		alias: 'variable'
	}
});

(function (Prism) {
	var keywords = [
		/\b(?:async|sync|yield)\*/,
		/\b(?:abstract|assert|async|await|break|case|catch|class|const|continue|covariant|default|deferred|do|dynamic|else|enum|export|extends|extension|external|factory|final|finally|for|get|hide|if|implements|import|in|interface|library|mixin|new|null|on|operator|part|rethrow|return|set|show|static|super|switch|sync|this|throw|try|typedef|var|void|while|with|yield)\b/
	];

	// Handles named imports, such as http.Client
	var packagePrefix = /(^|[^\w.])(?:[a-z]\w*\s*\.\s*)*(?:[A-Z]\w*\s*\.\s*)*/.source;

	// based on the dart naming conventions
	var className = {
		pattern: RegExp(packagePrefix + /[A-Z](?:[\d_A-Z]*[a-z]\w*)?\b/.source),
		lookbehind: true,
		inside: {
			'namespace': {
				pattern: /^[a-z]\w*(?:\s*\.\s*[a-z]\w*)*(?:\s*\.)?/,
				inside: {
					'punctuation': /\./
				}
			},
		}
	};

	Prism.languages.dart = Prism.languages.extend('clike', {
		'class-name': [
			className,
			{
				// variables and parameters
				// this to support class names (or generic parameters) which do not contain a lower case letter (also works for methods)
				pattern: RegExp(packagePrefix + /[A-Z]\w*(?=\s+\w+\s*[;,=()])/.source),
				lookbehind: true,
				inside: className.inside
			}
		],
		'keyword': keywords,
		'operator': /\bis!|\b(?:as|is)\b|\+\+|--|&&|\|\||<<=?|>>=?|~(?:\/=?)?|[+\-*\/%&^|=!<>]=?|\?/
	});

	Prism.languages.insertBefore('dart', 'string', {
		'string-literal': {
			pattern: /r?(?:("""|''')[\s\S]*?\1|(["'])(?:\\.|(?!\2)[^\\\r\n])*\2(?!\2))/,
			greedy: true,
			inside: {
				'interpolation': {
					pattern: /((?:^|[^\\])(?:\\{2})*)\$(?:\w+|\{(?:[^{}]|\{[^{}]*\})*\})/,
					lookbehind: true,
					inside: {
						'punctuation': /^\$\{?|\}$/,
						'expression': {
							pattern: /[\s\S]+/,
							inside: Prism.languages.dart
						}
					}
				},
				'string': /[\s\S]+/
			}
		},
		'string': undefined
	});

	Prism.languages.insertBefore('dart', 'class-name', {
		'metadata': {
			pattern: /@\w+/,
			alias: 'function'
		}
	});

	Prism.languages.insertBefore('dart', 'class-name', {
		'generics': {
			pattern: /<(?:[\w\s,.&?]|<(?:[\w\s,.&?]|<(?:[\w\s,.&?]|<[\w\s,.&?]*>)*>)*>)*>/,
			inside: {
				'class-name': className,
				'keyword': keywords,
				'punctuation': /[<>(),.:]/,
				'operator': /[?&|]/
			}
		},
	});
}(Prism));

(function (Prism) {

	Prism.languages.diff = {
		'coord': [
			// Match all kinds of coord lines (prefixed by "+++", "---" or "***").
			/^(?:\*{3}|-{3}|\+{3}).*$/m,
			// Match "@@ ... @@" coord lines in unified diff.
			/^@@.*@@$/m,
			// Match coord lines in normal diff (starts with a number).
			/^\d.*$/m
		]

		// deleted, inserted, unchanged, diff
	};

	/**
	 * A map from the name of a block to its line prefix.
	 *
	 * @type {Object<string, string>}
	 */
	var PREFIXES = {
		'deleted-sign': '-',
		'deleted-arrow': '<',
		'inserted-sign': '+',
		'inserted-arrow': '>',
		'unchanged': ' ',
		'diff': '!',
	};

	// add a token for each prefix
	Object.keys(PREFIXES).forEach(function (name) {
		var prefix = PREFIXES[name];

		var alias = [];
		if (!/^\w+$/.test(name)) { // "deleted-sign" -> "deleted"
			alias.push(/\w+/.exec(name)[0]);
		}
		if (name === 'diff') {
			alias.push('bold');
		}

		Prism.languages.diff[name] = {
			pattern: RegExp('^(?:[' + prefix + '].*(?:\r\n?|\n|(?![\\s\\S])))+', 'm'),
			alias: alias,
			inside: {
				'line': {
					pattern: /(.)(?=[\s\S]).*(?:\r\n?|\n)?/,
					lookbehind: true
				},
				'prefix': {
					pattern: /[\s\S]/,
					alias: /\w+/.exec(name)[0]
				}
			}
		};

	});

	// make prefixes available to Diff plugin
	Object.defineProperty(Prism.languages.diff, 'PREFIXES', {
		value: PREFIXES
	});

}(Prism));

(function (Prism) {

	/**
	 * Returns the placeholder for the given language id and index.
	 *
	 * @param {string} language
	 * @param {string|number} index
	 * @returns {string}
	 */
	function getPlaceholder(language, index) {
		return '___' + language.toUpperCase() + index + '___';
	}

	Object.defineProperties(Prism.languages['markup-templating'] = {}, {
		buildPlaceholders: {
			/**
			 * Tokenize all inline templating expressions matching `placeholderPattern`.
			 *
			 * If `replaceFilter` is provided, only matches of `placeholderPattern` for which `replaceFilter` returns
			 * `true` will be replaced.
			 *
			 * @param {object} env The environment of the `before-tokenize` hook.
			 * @param {string} language The language id.
			 * @param {RegExp} placeholderPattern The matches of this pattern will be replaced by placeholders.
			 * @param {(match: string) => boolean} [replaceFilter]
			 */
			value: function (env, language, placeholderPattern, replaceFilter) {
				if (env.language !== language) {
					return;
				}

				var tokenStack = env.tokenStack = [];

				env.code = env.code.replace(placeholderPattern, function (match) {
					if (typeof replaceFilter === 'function' && !replaceFilter(match)) {
						return match;
					}
					var i = tokenStack.length;
					var placeholder;

					// Check for existing strings
					while (env.code.indexOf(placeholder = getPlaceholder(language, i)) !== -1) {
						++i;
					}

					// Create a sparse array
					tokenStack[i] = match;

					return placeholder;
				});

				// Switch the grammar to markup
				env.grammar = Prism.languages.markup;
			}
		},
		tokenizePlaceholders: {
			/**
			 * Replace placeholders with proper tokens after tokenizing.
			 *
			 * @param {object} env The environment of the `after-tokenize` hook.
			 * @param {string} language The language id.
			 */
			value: function (env, language) {
				if (env.language !== language || !env.tokenStack) {
					return;
				}

				// Switch the grammar back
				env.grammar = Prism.languages[language];

				var j = 0;
				var keys = Object.keys(env.tokenStack);

				function walkTokens(tokens) {
					for (var i = 0; i < tokens.length; i++) {
						// all placeholders are replaced already
						if (j >= keys.length) {
							break;
						}

						var token = tokens[i];
						if (typeof token === 'string' || (token.content && typeof token.content === 'string')) {
							var k = keys[j];
							var t = env.tokenStack[k];
							var s = typeof token === 'string' ? token : token.content;
							var placeholder = getPlaceholder(language, k);

							var index = s.indexOf(placeholder);
							if (index > -1) {
								++j;

								var before = s.substring(0, index);
								var middle = new Prism.Token(language, Prism.tokenize(t, env.grammar), 'language-' + language, t);
								var after = s.substring(index + placeholder.length);

								var replacement = [];
								if (before) {
									replacement.push.apply(replacement, walkTokens([before]));
								}
								replacement.push(middle);
								if (after) {
									replacement.push.apply(replacement, walkTokens([after]));
								}

								if (typeof token === 'string') {
									tokens.splice.apply(tokens, [i, 1].concat(replacement));
								} else {
									token.content = replacement;
								}
							}
						} else if (token.content /* && typeof token.content !== 'string' */) {
							walkTokens(token.content);
						}
					}

					return tokens;
				}

				walkTokens(env.tokens);
			}
		}
	});

}(Prism));

// Django/Jinja2 syntax definition for Prism.js <http://prismjs.com> syntax highlighter.
// Mostly it works OK but can paint code incorrectly on complex html/template tag combinations.

(function (Prism) {

	Prism.languages.django = {
		'comment': /^\{#[\s\S]*?#\}$/,
		'tag': {
			pattern: /(^\{%[+-]?\s*)\w+/,
			lookbehind: true,
			alias: 'keyword'
		},
		'delimiter': {
			pattern: /^\{[{%][+-]?|[+-]?[}%]\}$/,
			alias: 'punctuation'
		},
		'string': {
			pattern: /("|')(?:\\.|(?!\1)[^\\\r\n])*\1/,
			greedy: true
		},
		'filter': {
			pattern: /(\|)\w+/,
			lookbehind: true,
			alias: 'function'
		},
		'test': {
			pattern: /(\bis\s+(?:not\s+)?)(?!not\b)\w+/,
			lookbehind: true,
			alias: 'function'
		},
		'function': /\b[a-z_]\w+(?=\s*\()/i,
		'keyword': /\b(?:and|as|by|else|for|if|import|in|is|loop|not|or|recursive|with|without)\b/,
		'operator': /[-+%=]=?|!=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]/,
		'number': /\b\d+(?:\.\d+)?\b/,
		'boolean': /[Ff]alse|[Nn]one|[Tt]rue/,
		'variable': /\b\w+\b/,
		'punctuation': /[{}[\](),.:;]/
	};


	var pattern = /\{\{[\s\S]*?\}\}|\{%[\s\S]*?%\}|\{#[\s\S]*?#\}/g;
	var markupTemplating = Prism.languages['markup-templating'];

	Prism.hooks.add('before-tokenize', function (env) {
		markupTemplating.buildPlaceholders(env, 'django', pattern);
	});
	Prism.hooks.add('after-tokenize', function (env) {
		markupTemplating.tokenizePlaceholders(env, 'django');
	});

	// Add an Jinja2 alias
	Prism.languages.jinja2 = Prism.languages.django;
	Prism.hooks.add('before-tokenize', function (env) {
		markupTemplating.buildPlaceholders(env, 'jinja2', pattern);
	});
	Prism.hooks.add('after-tokenize', function (env) {
		markupTemplating.tokenizePlaceholders(env, 'jinja2');
	});

}(Prism));

// https://www.graphviz.org/doc/info/lang.html

(function (Prism) {

	var ID = '(?:' + [
		// an identifier
		/[a-zA-Z_\x80-\uFFFF][\w\x80-\uFFFF]*/.source,
		// a number
		/-?(?:\.\d+|\d+(?:\.\d*)?)/.source,
		// a double-quoted string
		/"[^"\\]*(?:\\[\s\S][^"\\]*)*"/.source,
		// HTML-like string
		/<(?:[^<>]|(?!<!--)<(?:[^<>"']|"[^"]*"|'[^']*')+>|<!--(?:[^-]|-(?!->))*-->)*>/.source
	].join('|') + ')';

	var IDInside = {
		'markup': {
			pattern: /(^<)[\s\S]+(?=>$)/,
			lookbehind: true,
			alias: ['language-markup', 'language-html', 'language-xml'],
			inside: Prism.languages.markup
		}
	};

	/**
	 * @param {string} source
	 * @param {string} flags
	 * @returns {RegExp}
	 */
	function withID(source, flags) {
		return RegExp(source.replace(/<ID>/g, function () { return ID; }), flags);
	}

	Prism.languages.dot = {
		'comment': {
			pattern: /\/\/.*|\/\*[\s\S]*?\*\/|^#.*/m,
			greedy: true
		},
		'graph-name': {
			pattern: withID(/(\b(?:digraph|graph|subgraph)[ \t\r\n]+)<ID>/.source, 'i'),
			lookbehind: true,
			greedy: true,
			alias: 'class-name',
			inside: IDInside
		},
		'attr-value': {
			pattern: withID(/(=[ \t\r\n]*)<ID>/.source),
			lookbehind: true,
			greedy: true,
			inside: IDInside
		},
		'attr-name': {
			pattern: withID(/([\[;, \t\r\n])<ID>(?=[ \t\r\n]*=)/.source),
			lookbehind: true,
			greedy: true,
			inside: IDInside
		},
		'keyword': /\b(?:digraph|edge|graph|node|strict|subgraph)\b/i,
		'compass-point': {
			pattern: /(:[ \t\r\n]*)(?:[ewc_]|[ns][ew]?)(?![\w\x80-\uFFFF])/,
			lookbehind: true,
			alias: 'builtin'
		},
		'node': {
			pattern: withID(/(^|[^-.\w\x80-\uFFFF\\])<ID>/.source),
			lookbehind: true,
			greedy: true,
			inside: IDInside
		},
		'operator': /[=:]|-[->]/,
		'punctuation': /[\[\]{};,]/
	};

	Prism.languages.gv = Prism.languages.dot;

}(Prism));

Prism.languages.elixir = {
	'doc': {
		pattern: /@(?:doc|moduledoc)\s+(?:("""|''')[\s\S]*?\1|("|')(?:\\(?:\r\n|[\s\S])|(?!\2)[^\\\r\n])*\2)/,
		inside: {
			'attribute': /^@\w+/,
			'string': /['"][\s\S]+/
		}
	},
	'comment': {
		pattern: /#.*/,
		greedy: true
	},
	// ~r"""foo""" (multi-line), ~r'''foo''' (multi-line), ~r/foo/, ~r|foo|, ~r"foo", ~r'foo', ~r(foo), ~r[foo], ~r{foo}, ~r<foo>
	'regex': {
		pattern: /~[rR](?:("""|''')(?:\\[\s\S]|(?!\1)[^\\])+\1|([\/|"'])(?:\\.|(?!\2)[^\\\r\n])+\2|\((?:\\.|[^\\)\r\n])+\)|\[(?:\\.|[^\\\]\r\n])+\]|\{(?:\\.|[^\\}\r\n])+\}|<(?:\\.|[^\\>\r\n])+>)[uismxfr]*/,
		greedy: true
	},
	'string': [
		{
			// ~s"""foo""" (multi-line), ~s'''foo''' (multi-line), ~s/foo/, ~s|foo|, ~s"foo", ~s'foo', ~s(foo), ~s[foo], ~s{foo} (with interpolation care), ~s<foo>
			pattern: /~[cCsSwW](?:("""|''')(?:\\[\s\S]|(?!\1)[^\\])+\1|([\/|"'])(?:\\.|(?!\2)[^\\\r\n])+\2|\((?:\\.|[^\\)\r\n])+\)|\[(?:\\.|[^\\\]\r\n])+\]|\{(?:\\.|#\{[^}]+\}|#(?!\{)|[^#\\}\r\n])+\}|<(?:\\.|[^\\>\r\n])+>)[csa]?/,
			greedy: true,
			inside: {
				// See interpolation below
			}
		},
		{
			pattern: /("""|''')[\s\S]*?\1/,
			greedy: true,
			inside: {
				// See interpolation below
			}
		},
		{
			// Multi-line strings are allowed
			pattern: /("|')(?:\\(?:\r\n|[\s\S])|(?!\1)[^\\\r\n])*\1/,
			greedy: true,
			inside: {
				// See interpolation below
			}
		}
	],
	'atom': {
		// Look-behind prevents bad highlighting of the :: operator
		pattern: /(^|[^:]):\w+/,
		lookbehind: true,
		alias: 'symbol'
	},
	'module': {
		pattern: /\b[A-Z]\w*\b/,
		alias: 'class-name'
	},
	// Look-ahead prevents bad highlighting of the :: operator
	'attr-name': /\b\w+\??:(?!:)/,
	'argument': {
		// Look-behind prevents bad highlighting of the && operator
		pattern: /(^|[^&])&\d+/,
		lookbehind: true,
		alias: 'variable'
	},
	'attribute': {
		pattern: /@\w+/,
		alias: 'variable'
	},
	'function': /\b[_a-zA-Z]\w*[?!]?(?:(?=\s*(?:\.\s*)?\()|(?=\/\d))/,
	'number': /\b(?:0[box][a-f\d_]+|\d[\d_]*)(?:\.[\d_]+)?(?:e[+-]?[\d_]+)?\b/i,
	'keyword': /\b(?:after|alias|and|case|catch|cond|def(?:callback|delegate|exception|impl|macro|module|n|np|p|protocol|struct)?|do|else|end|fn|for|if|import|not|or|quote|raise|require|rescue|try|unless|unquote|use|when)\b/,
	'boolean': /\b(?:false|nil|true)\b/,
	'operator': [
		/\bin\b|&&?|\|[|>]?|\\\\|::|\.\.\.?|\+\+?|-[->]?|<[-=>]|>=|!==?|\B!|=(?:==?|[>~])?|[*\/^]/,
		{
			// We don't want to match <<
			pattern: /([^<])<(?!<)/,
			lookbehind: true
		},
		{
			// We don't want to match >>
			pattern: /([^>])>(?!>)/,
			lookbehind: true
		}
	],
	'punctuation': /<<|>>|[.,%\[\]{}()]/
};

Prism.languages.elixir.string.forEach(function (o) {
	o.inside = {
		'interpolation': {
			pattern: /#\{[^}]+\}/,
			inside: {
				'delimiter': {
					pattern: /^#\{|\}$/,
					alias: 'punctuation'
				},
				rest: Prism.languages.elixir
			}
		}
	};
});

Prism.languages.erlang = {
	'comment': /%.+/,
	'string': {
		pattern: /"(?:\\.|[^\\"\r\n])*"/,
		greedy: true
	},
	'quoted-function': {
		pattern: /'(?:\\.|[^\\'\r\n])+'(?=\()/,
		alias: 'function'
	},
	'quoted-atom': {
		pattern: /'(?:\\.|[^\\'\r\n])+'/,
		alias: 'atom'
	},
	'boolean': /\b(?:false|true)\b/,
	'keyword': /\b(?:after|begin|case|catch|end|fun|if|of|receive|try|when)\b/,
	'number': [
		/\$\\?./,
		/\b\d+#[a-z0-9]+/i,
		/(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e[+-]?\d+)?/i
	],
	'function': /\b[a-z][\w@]*(?=\()/,
	'variable': {
		// Look-behind is used to prevent wrong highlighting of atoms containing "@"
		pattern: /(^|[^@])(?:\b|\?)[A-Z_][\w@]*/,
		lookbehind: true
	},
	'operator': [
		/[=\/<>:]=|=[:\/]=|\+\+?|--?|[=*\/!]|\b(?:and|andalso|band|bnot|bor|bsl|bsr|bxor|div|not|or|orelse|rem|xor)\b/,
		{
			// We don't want to match <<
			pattern: /(^|[^<])<(?!<)/,
			lookbehind: true
		},
		{
			// We don't want to match >>
			pattern: /(^|[^>])>(?!>)/,
			lookbehind: true
		}
	],
	'atom': /\b[a-z][\w@]*/,
	'punctuation': /[()[\]{}:;,.#|]|<<|>>/

};

Prism.languages.go = Prism.languages.extend('clike', {
	'string': {
		pattern: /(^|[^\\])"(?:\\.|[^"\\\r\n])*"|`[^`]*`/,
		lookbehind: true,
		greedy: true
	},
	'keyword': /\b(?:break|case|chan|const|continue|default|defer|else|fallthrough|for|func|go(?:to)?|if|import|interface|map|package|range|return|select|struct|switch|type|var)\b/,
	'boolean': /\b(?:_|false|iota|nil|true)\b/,
	'number': [
		// binary and octal integers
		/\b0(?:b[01_]+|o[0-7_]+)i?\b/i,
		// hexadecimal integers and floats
		/\b0x(?:[a-f\d_]+(?:\.[a-f\d_]*)?|\.[a-f\d_]+)(?:p[+-]?\d+(?:_\d+)*)?i?(?!\w)/i,
		// decimal integers and floats
		/(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d[\d_]*)(?:e[+-]?[\d_]+)?i?(?!\w)/i
	],
	'operator': /[*\/%^!=]=?|\+[=+]?|-[=-]?|\|[=|]?|&(?:=|&|\^=?)?|>(?:>=?|=)?|<(?:<=?|=|-)?|:=|\.\.\./,
	'builtin': /\b(?:append|bool|byte|cap|close|complex|complex(?:64|128)|copy|delete|error|float(?:32|64)|u?int(?:8|16|32|64)?|imag|len|make|new|panic|print(?:ln)?|real|recover|rune|string|uintptr)\b/
});

Prism.languages.insertBefore('go', 'string', {
	'char': {
		pattern: /'(?:\\.|[^'\\\r\n]){0,10}'/,
		greedy: true
	}
});

delete Prism.languages.go['class-name'];

(function (Prism) {

	var interpolation = {
		pattern: /((?:^|[^\\$])(?:\\{2})*)\$(?:\w+|\{[^{}]*\})/,
		lookbehind: true,
		inside: {
			'interpolation-punctuation': {
				pattern: /^\$\{?|\}$/,
				alias: 'punctuation'
			},
			'expression': {
				pattern: /[\s\S]+/,
				inside: null // see below
			}
		}
	};

	Prism.languages.groovy = Prism.languages.extend('clike', {
		'string': {
			// https://groovy-lang.org/syntax.html#_dollar_slashy_string
			pattern: /'''(?:[^\\]|\\[\s\S])*?'''|'(?:\\.|[^\\'\r\n])*'/,
			greedy: true
		},
		'keyword': /\b(?:abstract|as|assert|boolean|break|byte|case|catch|char|class|const|continue|def|default|do|double|else|enum|extends|final|finally|float|for|goto|if|implements|import|in|instanceof|int|interface|long|native|new|package|private|protected|public|return|short|static|strictfp|super|switch|synchronized|this|throw|throws|trait|transient|try|void|volatile|while)\b/,
		'number': /\b(?:0b[01_]+|0x[\da-f_]+(?:\.[\da-f_p\-]+)?|[\d_]+(?:\.[\d_]+)?(?:e[+-]?\d+)?)[glidf]?\b/i,
		'operator': {
			pattern: /(^|[^.])(?:~|==?~?|\?[.:]?|\*(?:[.=]|\*=?)?|\.[@&]|\.\.<|\.\.(?!\.)|-[-=>]?|\+[+=]?|!=?|<(?:<=?|=>?)?|>(?:>>?=?|=)?|&[&=]?|\|[|=]?|\/=?|\^=?|%=?)/,
			lookbehind: true
		},
		'punctuation': /\.+|[{}[\];(),:$]/
	});

	Prism.languages.insertBefore('groovy', 'string', {
		'shebang': {
			pattern: /#!.+/,
			alias: 'comment',
			greedy: true
		},
		'interpolation-string': {
			// TODO: Slash strings (e.g. /foo/) can contain line breaks but this will cause a lot of trouble with
			// simple division (see JS regex), so find a fix maybe?
			pattern: /"""(?:[^\\]|\\[\s\S])*?"""|(["/])(?:\\.|(?!\1)[^\\\r\n])*\1|\$\/(?:[^/$]|\$(?:[/$]|(?![/$]))|\/(?!\$))*\/\$/,
			greedy: true,
			inside: {
				'interpolation': interpolation,
				'string': /[\s\S]+/
			}
		}
	});

	Prism.languages.insertBefore('groovy', 'punctuation', {
		'spock-block': /\b(?:and|cleanup|expect|given|setup|then|when|where):/
	});

	Prism.languages.insertBefore('groovy', 'function', {
		'annotation': {
			pattern: /(^|[^.])@\w+/,
			lookbehind: true,
			alias: 'punctuation'
		}
	});

	interpolation.inside.expression.inside = Prism.languages.groovy;

}(Prism));

(function (Prism) {

	var keywords = /\b(?:abstract|assert|boolean|break|byte|case|catch|char|class|const|continue|default|do|double|else|enum|exports|extends|final|finally|float|for|goto|if|implements|import|instanceof|int|interface|long|module|native|new|non-sealed|null|open|opens|package|permits|private|protected|provides|public|record(?!\s*[(){}[\]<>=%~.:,;?+\-*/&|^])|requires|return|sealed|short|static|strictfp|super|switch|synchronized|this|throw|throws|to|transient|transitive|try|uses|var|void|volatile|while|with|yield)\b/;

	// full package (optional) + parent classes (optional)
	var classNamePrefix = /(?:[a-z]\w*\s*\.\s*)*(?:[A-Z]\w*\s*\.\s*)*/.source;

	// based on the java naming conventions
	var className = {
		pattern: RegExp(/(^|[^\w.])/.source + classNamePrefix + /[A-Z](?:[\d_A-Z]*[a-z]\w*)?\b/.source),
		lookbehind: true,
		inside: {
			'namespace': {
				pattern: /^[a-z]\w*(?:\s*\.\s*[a-z]\w*)*(?:\s*\.)?/,
				inside: {
					'punctuation': /\./
				}
			},
			'punctuation': /\./
		}
	};

	Prism.languages.java = Prism.languages.extend('clike', {
		'string': {
			pattern: /(^|[^\\])"(?:\\.|[^"\\\r\n])*"/,
			lookbehind: true,
			greedy: true
		},
		'class-name': [
			className,
			{
				// variables, parameters, and constructor references
				// this to support class names (or generic parameters) which do not contain a lower case letter (also works for methods)
				pattern: RegExp(/(^|[^\w.])/.source + classNamePrefix + /[A-Z]\w*(?=\s+\w+\s*[;,=()]|\s*(?:\[[\s,]*\]\s*)?::\s*new\b)/.source),
				lookbehind: true,
				inside: className.inside
			},
			{
				// class names based on keyword
				// this to support class names (or generic parameters) which do not contain a lower case letter (also works for methods)
				pattern: RegExp(/(\b(?:class|enum|extends|implements|instanceof|interface|new|record|throws)\s+)/.source + classNamePrefix + /[A-Z]\w*\b/.source),
				lookbehind: true,
				inside: className.inside
			}
		],
		'keyword': keywords,
		'function': [
			Prism.languages.clike.function,
			{
				pattern: /(::\s*)[a-z_]\w*/,
				lookbehind: true
			}
		],
		'number': /\b0b[01][01_]*L?\b|\b0x(?:\.[\da-f_p+-]+|[\da-f_]+(?:\.[\da-f_p+-]+)?)\b|(?:\b\d[\d_]*(?:\.[\d_]*)?|\B\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?[dfl]?/i,
		'operator': {
			pattern: /(^|[^.])(?:<<=?|>>>?=?|->|--|\+\+|&&|\|\||::|[?:~]|[-+*/%&|^!=<>]=?)/m,
			lookbehind: true
		},
		'constant': /\b[A-Z][A-Z_\d]+\b/
	});

	Prism.languages.insertBefore('java', 'string', {
		'triple-quoted-string': {
			// http://openjdk.java.net/jeps/355#Description
			pattern: /"""[ \t]*[\r\n](?:(?:"|"")?(?:\\.|[^"\\]))*"""/,
			greedy: true,
			alias: 'string'
		},
		'char': {
			pattern: /'(?:\\.|[^'\\\r\n]){1,6}'/,
			greedy: true
		}
	});

	Prism.languages.insertBefore('java', 'class-name', {
		'annotation': {
			pattern: /(^|[^.])@\w+(?:\s*\.\s*\w+)*/,
			lookbehind: true,
			alias: 'punctuation'
		},
		'generics': {
			pattern: /<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&)|<(?:[\w\s,.?]|&(?!&))*>)*>)*>)*>/,
			inside: {
				'class-name': className,
				'keyword': keywords,
				'punctuation': /[<>(),.:]/,
				'operator': /[?&|]/
			}
		},
		'import': [
			{
				pattern: RegExp(/(\bimport\s+)/.source + classNamePrefix + /(?:[A-Z]\w*|\*)(?=\s*;)/.source),
				lookbehind: true,
				inside: {
					'namespace': className.inside.namespace,
					'punctuation': /\./,
					'operator': /\*/,
					'class-name': /\w+/
				}
			},
			{
				pattern: RegExp(/(\bimport\s+static\s+)/.source + classNamePrefix + /(?:\w+|\*)(?=\s*;)/.source),
				lookbehind: true,
				alias: 'static',
				inside: {
					'namespace': className.inside.namespace,
					'static': /\b\w+$/,
					'punctuation': /\./,
					'operator': /\*/,
					'class-name': /\w+/
				}
			}
		],
		'namespace': {
			pattern: RegExp(
				/(\b(?:exports|import(?:\s+static)?|module|open|opens|package|provides|requires|to|transitive|uses|with)\s+)(?!<keyword>)[a-z]\w*(?:\.[a-z]\w*)*\.?/
					.source.replace(/<keyword>/g, function () { return keywords.source; })),
			lookbehind: true,
			inside: {
				'punctuation': /\./,
			}
		}
	});
}(Prism));

// https://www.json.org/json-en.html
Prism.languages.json = {
	'property': {
		pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?=\s*:)/,
		lookbehind: true,
		greedy: true
	},
	'string': {
		pattern: /(^|[^\\])"(?:\\.|[^\\"\r\n])*"(?!\s*:)/,
		lookbehind: true,
		greedy: true
	},
	'comment': {
		pattern: /\/\/.*|\/\*[\s\S]*?(?:\*\/|$)/,
		greedy: true
	},
	'number': /-?\b\d+(?:\.\d+)?(?:e[+-]?\d+)?\b/i,
	'punctuation': /[{}[\],]/,
	'operator': /:/,
	'boolean': /\b(?:false|true)\b/,
	'null': {
		pattern: /\bnull\b/,
		alias: 'keyword'
	}
};

Prism.languages.webmanifest = Prism.languages.json;

Prism.languages.julia = {
	'comment': {
		// support one level of nested comments
		// https://github.com/JuliaLang/julia/pull/6128
		pattern: /(^|[^\\])(?:#=(?:[^#=]|=(?!#)|#(?!=)|#=(?:[^#=]|=(?!#)|#(?!=))*=#)*=#|#.*)/,
		lookbehind: true
	},
	'regex': {
		// https://docs.julialang.org/en/v1/manual/strings/#Regular-Expressions-1
		pattern: /r"(?:\\.|[^"\\\r\n])*"[imsx]{0,4}/,
		greedy: true
	},
	'string': {
		// https://docs.julialang.org/en/v1/manual/strings/#String-Basics-1
		// https://docs.julialang.org/en/v1/manual/strings/#non-standard-string-literals-1
		// https://docs.julialang.org/en/v1/manual/running-external-programs/#Running-External-Programs-1
		pattern: /"""[\s\S]+?"""|(?:\b\w+)?"(?:\\.|[^"\\\r\n])*"|`(?:[^\\`\r\n]|\\.)*`/,
		greedy: true
	},
	'char': {
		// https://docs.julialang.org/en/v1/manual/strings/#man-characters-1
		pattern: /(^|[^\w'])'(?:\\[^\r\n][^'\r\n]*|[^\\\r\n])'/,
		lookbehind: true,
		greedy: true
	},
	'keyword': /\b(?:abstract|baremodule|begin|bitstype|break|catch|ccall|const|continue|do|else|elseif|end|export|finally|for|function|global|if|immutable|import|importall|in|let|local|macro|module|print|println|quote|return|struct|try|type|typealias|using|while)\b/,
	'boolean': /\b(?:false|true)\b/,
	'number': /(?:\b(?=\d)|\B(?=\.))(?:0[box])?(?:[\da-f]+(?:_[\da-f]+)*(?:\.(?:\d+(?:_\d+)*)?)?|\.\d+(?:_\d+)*)(?:[efp][+-]?\d+(?:_\d+)*)?j?/i,
	// https://docs.julialang.org/en/v1/manual/mathematical-operations/
	// https://docs.julialang.org/en/v1/manual/mathematical-operations/#Operator-Precedence-and-Associativity-1
	'operator': /&&|\|\||[-+*^%÷⊻&$\\]=?|\/[\/=]?|!=?=?|\|[=>]?|<(?:<=?|[=:|])?|>(?:=|>>?=?)?|==?=?|[~≠≤≥'√∛]/,
	'punctuation': /::?|[{}[\]();,.?]/,
	// https://docs.julialang.org/en/v1/base/numbers/#Base.im
	'constant': /\b(?:(?:Inf|NaN)(?:16|32|64)?|im|pi)\b|[πℯ]/
};

(function (Prism) {
	Prism.languages.kotlin = Prism.languages.extend('clike', {
		'keyword': {
			// The lookbehind prevents wrong highlighting of e.g. kotlin.properties.get
			pattern: /(^|[^.])\b(?:abstract|actual|annotation|as|break|by|catch|class|companion|const|constructor|continue|crossinline|data|do|dynamic|else|enum|expect|external|final|finally|for|fun|get|if|import|in|infix|init|inline|inner|interface|internal|is|lateinit|noinline|null|object|open|operator|out|override|package|private|protected|public|reified|return|sealed|set|super|suspend|tailrec|this|throw|to|try|typealias|val|var|vararg|when|where|while)\b/,
			lookbehind: true
		},
		'function': [
			{
				pattern: /(?:`[^\r\n`]+`|\b\w+)(?=\s*\()/,
				greedy: true
			},
			{
				pattern: /(\.)(?:`[^\r\n`]+`|\w+)(?=\s*\{)/,
				lookbehind: true,
				greedy: true
			}
		],
		'number': /\b(?:0[xX][\da-fA-F]+(?:_[\da-fA-F]+)*|0[bB][01]+(?:_[01]+)*|\d+(?:_\d+)*(?:\.\d+(?:_\d+)*)?(?:[eE][+-]?\d+(?:_\d+)*)?[fFL]?)\b/,
		'operator': /\+[+=]?|-[-=>]?|==?=?|!(?:!|==?)?|[\/*%<>]=?|[?:]:?|\.\.|&&|\|\||\b(?:and|inv|or|shl|shr|ushr|xor)\b/
	});

	delete Prism.languages.kotlin['class-name'];

	var interpolationInside = {
		'interpolation-punctuation': {
			pattern: /^\$\{?|\}$/,
			alias: 'punctuation'
		},
		'expression': {
			pattern: /[\s\S]+/,
			inside: Prism.languages.kotlin
		}
	};

	Prism.languages.insertBefore('kotlin', 'string', {
		// https://kotlinlang.org/spec/expressions.html#string-interpolation-expressions
		'string-literal': [
			{
				pattern: /"""(?:[^$]|\$(?:(?!\{)|\{[^{}]*\}))*?"""/,
				alias: 'multiline',
				inside: {
					'interpolation': {
						pattern: /\$(?:[a-z_]\w*|\{[^{}]*\})/i,
						inside: interpolationInside
					},
					'string': /[\s\S]+/
				}
			},
			{
				pattern: /"(?:[^"\\\r\n$]|\\.|\$(?:(?!\{)|\{[^{}]*\}))*"/,
				alias: 'singleline',
				inside: {
					'interpolation': {
						pattern: /((?:^|[^\\])(?:\\{2})*)\$(?:[a-z_]\w*|\{[^{}]*\})/i,
						lookbehind: true,
						inside: interpolationInside
					},
					'string': /[\s\S]+/
				}
			}
		],
		'char': {
			// https://kotlinlang.org/spec/expressions.html#character-literals
			pattern: /'(?:[^'\\\r\n]|\\(?:.|u[a-fA-F0-9]{0,4}))'/,
			greedy: true
		}
	});

	delete Prism.languages.kotlin['string'];

	Prism.languages.insertBefore('kotlin', 'keyword', {
		'annotation': {
			pattern: /\B@(?:\w+:)?(?:[A-Z]\w*|\[[^\]]+\])/,
			alias: 'builtin'
		}
	});

	Prism.languages.insertBefore('kotlin', 'function', {
		'label': {
			pattern: /\b\w+@|@\w+\b/,
			alias: 'symbol'
		}
	});

	Prism.languages.kt = Prism.languages.kotlin;
	Prism.languages.kts = Prism.languages.kotlin;
}(Prism));

(function (Prism) {
	var funcPattern = /\\(?:[^a-z()[\]]|[a-z*]+)/i;
	var insideEqu = {
		'equation-command': {
			pattern: funcPattern,
			alias: 'regex'
		}
	};

	Prism.languages.latex = {
		'comment': /%.*/,
		// the verbatim environment prints whitespace to the document
		'cdata': {
			pattern: /(\\begin\{((?:lstlisting|verbatim)\*?)\})[\s\S]*?(?=\\end\{\2\})/,
			lookbehind: true
		},
		/*
		 * equations can be between $$ $$ or $ $ or \( \) or \[ \]
		 * (all are multiline)
		 */
		'equation': [
			{
				pattern: /\$\$(?:\\[\s\S]|[^\\$])+\$\$|\$(?:\\[\s\S]|[^\\$])+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\]/,
				inside: insideEqu,
				alias: 'string'
			},
			{
				pattern: /(\\begin\{((?:align|eqnarray|equation|gather|math|multline)\*?)\})[\s\S]*?(?=\\end\{\2\})/,
				lookbehind: true,
				inside: insideEqu,
				alias: 'string'
			}
		],
		/*
		 * arguments which are keywords or references are highlighted
		 * as keywords
		 */
		'keyword': {
			pattern: /(\\(?:begin|cite|documentclass|end|label|ref|usepackage)(?:\[[^\]]+\])?\{)[^}]+(?=\})/,
			lookbehind: true
		},
		'url': {
			pattern: /(\\url\{)[^}]+(?=\})/,
			lookbehind: true
		},
		/*
		 * section or chapter headlines are highlighted as bold so that
		 * they stand out more
		 */
		'headline': {
			pattern: /(\\(?:chapter|frametitle|paragraph|part|section|subparagraph|subsection|subsubparagraph|subsubsection|subsubsubparagraph)\*?(?:\[[^\]]+\])?\{)[^}]+(?=\})/,
			lookbehind: true,
			alias: 'class-name'
		},
		'function': {
			pattern: funcPattern,
			alias: 'selector'
		},
		'punctuation': /[[\]{}&]/
	};

	Prism.languages.tex = Prism.languages.latex;
	Prism.languages.context = Prism.languages.latex;
}(Prism));

Prism.languages.lua = {
	'comment': /^#!.+|--(?:\[(=*)\[[\s\S]*?\]\1\]|.*)/m,
	// \z may be used to skip the following space
	'string': {
		pattern: /(["'])(?:(?!\1)[^\\\r\n]|\\z(?:\r\n|\s)|\\(?:\r\n|[^z]))*\1|\[(=*)\[[\s\S]*?\]\2\]/,
		greedy: true
	},
	'number': /\b0x[a-f\d]+(?:\.[a-f\d]*)?(?:p[+-]?\d+)?\b|\b\d+(?:\.\B|(?:\.\d*)?(?:e[+-]?\d+)?\b)|\B\.\d+(?:e[+-]?\d+)?\b/i,
	'keyword': /\b(?:and|break|do|else|elseif|end|false|for|function|goto|if|in|local|nil|not|or|repeat|return|then|true|until|while)\b/,
	'function': /(?!\d)\w+(?=\s*(?:[({]))/,
	'operator': [
		/[-+*%^&|#]|\/\/?|<[<=]?|>[>=]?|[=~]=?/,
		{
			// Match ".." but don't break "..."
			pattern: /(^|[^.])\.\.(?!\.)/,
			lookbehind: true
		}
	],
	'punctuation': /[\[\](){},;]|\.+|:+/
};

(function (Prism) {

	// Allow only one line break
	var inner = /(?:\\.|[^\\\n\r]|(?:\n|\r\n?)(?![\r\n]))/.source;

	/**
	 * This function is intended for the creation of the bold or italic pattern.
	 *
	 * This also adds a lookbehind group to the given pattern to ensure that the pattern is not backslash-escaped.
	 *
	 * _Note:_ Keep in mind that this adds a capturing group.
	 *
	 * @param {string} pattern
	 * @returns {RegExp}
	 */
	function createInline(pattern) {
		pattern = pattern.replace(/<inner>/g, function () { return inner; });
		return RegExp(/((?:^|[^\\])(?:\\{2})*)/.source + '(?:' + pattern + ')');
	}


	var tableCell = /(?:\\.|``(?:[^`\r\n]|`(?!`))+``|`[^`\r\n]+`|[^\\|\r\n`])+/.source;
	var tableRow = /\|?__(?:\|__)+\|?(?:(?:\n|\r\n?)|(?![\s\S]))/.source.replace(/__/g, function () { return tableCell; });
	var tableLine = /\|?[ \t]*:?-{3,}:?[ \t]*(?:\|[ \t]*:?-{3,}:?[ \t]*)+\|?(?:\n|\r\n?)/.source;


	Prism.languages.markdown = Prism.languages.extend('markup', {});
	Prism.languages.insertBefore('markdown', 'prolog', {
		'front-matter-block': {
			pattern: /(^(?:\s*[\r\n])?)---(?!.)[\s\S]*?[\r\n]---(?!.)/,
			lookbehind: true,
			greedy: true,
			inside: {
				'punctuation': /^---|---$/,
				'front-matter': {
					pattern: /\S+(?:\s+\S+)*/,
					alias: ['yaml', 'language-yaml'],
					inside: Prism.languages.yaml
				}
			}
		},
		'blockquote': {
			// > ...
			pattern: /^>(?:[\t ]*>)*/m,
			alias: 'punctuation'
		},
		'table': {
			pattern: RegExp('^' + tableRow + tableLine + '(?:' + tableRow + ')*', 'm'),
			inside: {
				'table-data-rows': {
					pattern: RegExp('^(' + tableRow + tableLine + ')(?:' + tableRow + ')*$'),
					lookbehind: true,
					inside: {
						'table-data': {
							pattern: RegExp(tableCell),
							inside: Prism.languages.markdown
						},
						'punctuation': /\|/
					}
				},
				'table-line': {
					pattern: RegExp('^(' + tableRow + ')' + tableLine + '$'),
					lookbehind: true,
					inside: {
						'punctuation': /\||:?-{3,}:?/
					}
				},
				'table-header-row': {
					pattern: RegExp('^' + tableRow + '$'),
					inside: {
						'table-header': {
							pattern: RegExp(tableCell),
							alias: 'important',
							inside: Prism.languages.markdown
						},
						'punctuation': /\|/
					}
				}
			}
		},
		'code': [
			{
				// Prefixed by 4 spaces or 1 tab and preceded by an empty line
				pattern: /((?:^|\n)[ \t]*\n|(?:^|\r\n?)[ \t]*\r\n?)(?: {4}|\t).+(?:(?:\n|\r\n?)(?: {4}|\t).+)*/,
				lookbehind: true,
				alias: 'keyword'
			},
			{
				// ```optional language
				// code block
				// ```
				pattern: /^```[\s\S]*?^```$/m,
				greedy: true,
				inside: {
					'code-block': {
						pattern: /^(```.*(?:\n|\r\n?))[\s\S]+?(?=(?:\n|\r\n?)^```$)/m,
						lookbehind: true
					},
					'code-language': {
						pattern: /^(```).+/,
						lookbehind: true
					},
					'punctuation': /```/
				}
			}
		],
		'title': [
			{
				// title 1
				// =======

				// title 2
				// -------
				pattern: /\S.*(?:\n|\r\n?)(?:==+|--+)(?=[ \t]*$)/m,
				alias: 'important',
				inside: {
					punctuation: /==+$|--+$/
				}
			},
			{
				// # title 1
				// ###### title 6
				pattern: /(^\s*)#.+/m,
				lookbehind: true,
				alias: 'important',
				inside: {
					punctuation: /^#+|#+$/
				}
			}
		],
		'hr': {
			// ***
			// ---
			// * * *
			// -----------
			pattern: /(^\s*)([*-])(?:[\t ]*\2){2,}(?=\s*$)/m,
			lookbehind: true,
			alias: 'punctuation'
		},
		'list': {
			// * item
			// + item
			// - item
			// 1. item
			pattern: /(^\s*)(?:[*+-]|\d+\.)(?=[\t ].)/m,
			lookbehind: true,
			alias: 'punctuation'
		},
		'url-reference': {
			// [id]: http://example.com "Optional title"
			// [id]: http://example.com 'Optional title'
			// [id]: http://example.com (Optional title)
			// [id]: <http://example.com> "Optional title"
			pattern: /!?\[[^\]]+\]:[\t ]+(?:\S+|<(?:\\.|[^>\\])+>)(?:[\t ]+(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\)))?/,
			inside: {
				'variable': {
					pattern: /^(!?\[)[^\]]+/,
					lookbehind: true
				},
				'string': /(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^)\\])*\))$/,
				'punctuation': /^[\[\]!:]|[<>]/
			},
			alias: 'url'
		},
		'bold': {
			// **strong**
			// __strong__

			// allow one nested instance of italic text using the same delimiter
			pattern: createInline(/\b__(?:(?!_)<inner>|_(?:(?!_)<inner>)+_)+__\b|\*\*(?:(?!\*)<inner>|\*(?:(?!\*)<inner>)+\*)+\*\*/.source),
			lookbehind: true,
			greedy: true,
			inside: {
				'content': {
					pattern: /(^..)[\s\S]+(?=..$)/,
					lookbehind: true,
					inside: {} // see below
				},
				'punctuation': /\*\*|__/
			}
		},
		'italic': {
			// *em*
			// _em_

			// allow one nested instance of bold text using the same delimiter
			pattern: createInline(/\b_(?:(?!_)<inner>|__(?:(?!_)<inner>)+__)+_\b|\*(?:(?!\*)<inner>|\*\*(?:(?!\*)<inner>)+\*\*)+\*/.source),
			lookbehind: true,
			greedy: true,
			inside: {
				'content': {
					pattern: /(^.)[\s\S]+(?=.$)/,
					lookbehind: true,
					inside: {} // see below
				},
				'punctuation': /[*_]/
			}
		},
		'strike': {
			// ~~strike through~~
			// ~strike~
			// eslint-disable-next-line regexp/strict
			pattern: createInline(/(~~?)(?:(?!~)<inner>)+\2/.source),
			lookbehind: true,
			greedy: true,
			inside: {
				'content': {
					pattern: /(^~~?)[\s\S]+(?=\1$)/,
					lookbehind: true,
					inside: {} // see below
				},
				'punctuation': /~~?/
			}
		},
		'code-snippet': {
			// `code`
			// ``code``
			pattern: /(^|[^\\`])(?:``[^`\r\n]+(?:`[^`\r\n]+)*``(?!`)|`[^`\r\n]+`(?!`))/,
			lookbehind: true,
			greedy: true,
			alias: ['code', 'keyword']
		},
		'url': {
			// [example](http://example.com "Optional title")
			// [example][id]
			// [example] [id]
			pattern: createInline(/!?\[(?:(?!\])<inner>)+\](?:\([^\s)]+(?:[\t ]+"(?:\\.|[^"\\])*")?\)|[ \t]?\[(?:(?!\])<inner>)+\])/.source),
			lookbehind: true,
			greedy: true,
			inside: {
				'operator': /^!/,
				'content': {
					pattern: /(^\[)[^\]]+(?=\])/,
					lookbehind: true,
					inside: {} // see below
				},
				'variable': {
					pattern: /(^\][ \t]?\[)[^\]]+(?=\]$)/,
					lookbehind: true
				},
				'url': {
					pattern: /(^\]\()[^\s)]+/,
					lookbehind: true
				},
				'string': {
					pattern: /(^[ \t]+)"(?:\\.|[^"\\])*"(?=\)$)/,
					lookbehind: true
				}
			}
		}
	});

	['url', 'bold', 'italic', 'strike'].forEach(function (token) {
		['url', 'bold', 'italic', 'strike', 'code-snippet'].forEach(function (inside) {
			if (token !== inside) {
				Prism.languages.markdown[token].inside.content.inside[inside] = Prism.languages.markdown[inside];
			}
		});
	});

	Prism.hooks.add('after-tokenize', function (env) {
		if (env.language !== 'markdown' && env.language !== 'md') {
			return;
		}

		function walkTokens(tokens) {
			if (!tokens || typeof tokens === 'string') {
				return;
			}

			for (var i = 0, l = tokens.length; i < l; i++) {
				var token = tokens[i];

				if (token.type !== 'code') {
					walkTokens(token.content);
					continue;
				}

				/*
				 * Add the correct `language-xxxx` class to this code block. Keep in mind that the `code-language` token
				 * is optional. But the grammar is defined so that there is only one case we have to handle:
				 *
				 * token.content = [
				 *     <span class="punctuation">```</span>,
				 *     <span class="code-language">xxxx</span>,
				 *     '\n', // exactly one new lines (\r or \n or \r\n)
				 *     <span class="code-block">...</span>,
				 *     '\n', // exactly one new lines again
				 *     <span class="punctuation">```</span>
				 * ];
				 */

				var codeLang = token.content[1];
				var codeBlock = token.content[3];

				if (codeLang && codeBlock &&
					codeLang.type === 'code-language' && codeBlock.type === 'code-block' &&
					typeof codeLang.content === 'string') {

					// this might be a language that Prism does not support

					// do some replacements to support C++, C#, and F#
					var lang = codeLang.content.replace(/\b#/g, 'sharp').replace(/\b\+\+/g, 'pp');
					// only use the first word
					lang = (/[a-z][\w-]*/i.exec(lang) || [''])[0].toLowerCase();
					var alias = 'language-' + lang;

					// add alias
					if (!codeBlock.alias) {
						codeBlock.alias = [alias];
					} else if (typeof codeBlock.alias === 'string') {
						codeBlock.alias = [codeBlock.alias, alias];
					} else {
						codeBlock.alias.push(alias);
					}
				}
			}
		}

		walkTokens(env.tokens);
	});

	Prism.hooks.add('wrap', function (env) {
		if (env.type !== 'code-block') {
			return;
		}

		var codeLang = '';
		for (var i = 0, l = env.classes.length; i < l; i++) {
			var cls = env.classes[i];
			var match = /language-(.+)/.exec(cls);
			if (match) {
				codeLang = match[1];
				break;
			}
		}

		var grammar = Prism.languages[codeLang];

		if (!grammar) {
			if (codeLang && codeLang !== 'none' && Prism.plugins.autoloader) {
				var id = 'md-' + new Date().valueOf() + '-' + Math.floor(Math.random() * 1e16);
				env.attributes['id'] = id;

				Prism.plugins.autoloader.loadLanguages(codeLang, function () {
					var ele = document.getElementById(id);
					if (ele) {
						ele.innerHTML = Prism.highlight(ele.textContent, Prism.languages[codeLang], codeLang);
					}
				});
			}
		} else {
			env.content = Prism.highlight(textContent(env.content), grammar, codeLang);
		}
	});

	var tagPattern = RegExp(Prism.languages.markup.tag.pattern.source, 'gi');

	/**
	 * A list of known entity names.
	 *
	 * This will always be incomplete to save space. The current list is the one used by lowdash's unescape function.
	 *
	 * @see {@link https://github.com/lodash/lodash/blob/2da024c3b4f9947a48517639de7560457cd4ec6c/unescape.js#L2}
	 */
	var KNOWN_ENTITY_NAMES = {
		'amp': '&',
		'lt': '<',
		'gt': '>',
		'quot': '"',
	};

	// IE 11 doesn't support `String.fromCodePoint`
	var fromCodePoint = String.fromCodePoint || String.fromCharCode;

	/**
	 * Returns the text content of a given HTML source code string.
	 *
	 * @param {string} html
	 * @returns {string}
	 */
	function textContent(html) {
		// remove all tags
		var text = html.replace(tagPattern, '');

		// decode known entities
		text = text.replace(/&(\w{1,8}|#x?[\da-f]{1,8});/gi, function (m, code) {
			code = code.toLowerCase();

			if (code[0] === '#') {
				var value;
				if (code[1] === 'x') {
					value = parseInt(code.slice(2), 16);
				} else {
					value = Number(code.slice(1));
				}

				return fromCodePoint(value);
			} else {
				var known = KNOWN_ENTITY_NAMES[code];
				if (known) {
					return known;
				}

				// unable to decode
				return m;
			}
		});

		return text;
	}

	Prism.languages.md = Prism.languages.markdown;

}(Prism));

Prism.languages.matlab = {
	'comment': [
		/%\{[\s\S]*?\}%/,
		/%.+/
	],
	'string': {
		pattern: /\B'(?:''|[^'\r\n])*'/,
		greedy: true
	},
	// FIXME We could handle imaginary numbers as a whole
	'number': /(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:[eE][+-]?\d+)?(?:[ij])?|\b[ij]\b/,
	'keyword': /\b(?:NaN|break|case|catch|continue|else|elseif|end|for|function|if|inf|otherwise|parfor|pause|pi|return|switch|try|while)\b/,
	'function': /\b(?!\d)\w+(?=\s*\()/,
	'operator': /\.?[*^\/\\']|[+\-:@]|[<>=~]=?|&&?|\|\|?/,
	'punctuation': /\.{3}|[.,;\[\](){}!]/
};

(function (Prism) {

	var variable = /\$(?:\w[a-z\d]*(?:_[^\x00-\x1F\s"'\\()$]*)?|\{[^}\s"'\\]+\})/i;

	Prism.languages.nginx = {
		'comment': {
			pattern: /(^|[\s{};])#.*/,
			lookbehind: true,
			greedy: true
		},
		'directive': {
			pattern: /(^|\s)\w(?:[^;{}"'\\\s]|\\.|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\s+(?:#.*(?!.)|(?![#\s])))*?(?=\s*[;{])/,
			lookbehind: true,
			greedy: true,
			inside: {
				'string': {
					pattern: /((?:^|[^\\])(?:\\\\)*)(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/,
					lookbehind: true,
					greedy: true,
					inside: {
						'escape': {
							pattern: /\\["'\\nrt]/,
							alias: 'entity'
						},
						'variable': variable
					}
				},
				'comment': {
					pattern: /(\s)#.*/,
					lookbehind: true,
					greedy: true
				},
				'keyword': {
					pattern: /^\S+/,
					greedy: true
				},

				// other patterns

				'boolean': {
					pattern: /(\s)(?:off|on)(?!\S)/,
					lookbehind: true
				},
				'number': {
					pattern: /(\s)\d+[a-z]*(?!\S)/i,
					lookbehind: true
				},
				'variable': variable
			}
		},
		'punctuation': /[{};]/
	};

}(Prism));

Prism.languages.nim = {
	'comment': {
		pattern: /#.*/,
		greedy: true
	},
	'string': {
		// Double-quoted strings can be prefixed by an identifier (Generalized raw string literals)
		pattern: /(?:\b(?!\d)(?:\w|\\x[89a-fA-F][0-9a-fA-F])+)?(?:"""[\s\S]*?"""(?!")|"(?:\\[\s\S]|""|[^"\\])*")/,
		greedy: true
	},
	'char': {
		// Character literals are handled specifically to prevent issues with numeric type suffixes
		pattern: /'(?:\\(?:\d+|x[\da-fA-F]{0,2}|.)|[^'])'/,
		greedy: true
	},

	'function': {
		pattern: /(?:(?!\d)(?:\w|\\x[89a-fA-F][0-9a-fA-F])+|`[^`\r\n]+`)\*?(?:\[[^\]]+\])?(?=\s*\()/,
		greedy: true,
		inside: {
			'operator': /\*$/
		}
	},
	// We don't want to highlight operators (and anything really) inside backticks
	'identifier': {
		pattern: /`[^`\r\n]+`/,
		greedy: true,
		inside: {
			'punctuation': /`/
		}
	},

	// The negative look ahead prevents wrong highlighting of the .. operator
	'number': /\b(?:0[xXoObB][\da-fA-F_]+|\d[\d_]*(?:(?!\.\.)\.[\d_]*)?(?:[eE][+-]?\d[\d_]*)?)(?:'?[iuf]\d*)?/,
	'keyword': /\b(?:addr|as|asm|atomic|bind|block|break|case|cast|concept|const|continue|converter|defer|discard|distinct|do|elif|else|end|enum|except|export|finally|for|from|func|generic|if|import|include|interface|iterator|let|macro|method|mixin|nil|object|out|proc|ptr|raise|ref|return|static|template|try|tuple|type|using|var|when|while|with|without|yield)\b/,
	'operator': {
		// Look behind and look ahead prevent wrong highlighting of punctuations [. .] {. .} (. .)
		// but allow the slice operator .. to take precedence over them
		// One can define his own operators in Nim so all combination of operators might be an operator.
		pattern: /(^|[({\[](?=\.\.)|(?![({\[]\.).)(?:(?:[=+\-*\/<>@$~&%|!?^:\\]|\.\.|\.(?![)}\]]))+|\b(?:and|div|in|is|isnot|mod|not|notin|of|or|shl|shr|xor)\b)/m,
		lookbehind: true
	},
	'punctuation': /[({\[]\.|\.[)}\]]|[`(){}\[\],:]/
};

Prism.languages.nix = {
	'comment': {
		pattern: /\/\*[\s\S]*?\*\/|#.*/,
		greedy: true
	},
	'string': {
		pattern: /"(?:[^"\\]|\\[\s\S])*"|''(?:(?!'')[\s\S]|''(?:'|\\|\$\{))*''/,
		greedy: true,
		inside: {
			'interpolation': {
				// The lookbehind ensures the ${} is not preceded by \ or ''
				pattern: /(^|(?:^|(?!'').)[^\\])\$\{(?:[^{}]|\{[^}]*\})*\}/,
				lookbehind: true,
				inside: null // see below
			}
		}
	},
	'url': [
		/\b(?:[a-z]{3,7}:\/\/)[\w\-+%~\/.:#=?&]+/,
		{
			pattern: /([^\/])(?:[\w\-+%~.:#=?&]*(?!\/\/)[\w\-+%~\/.:#=?&])?(?!\/\/)\/[\w\-+%~\/.:#=?&]*/,
			lookbehind: true
		}
	],
	'antiquotation': {
		pattern: /\$(?=\{)/,
		alias: 'important'
	},
	'number': /\b\d+\b/,
	'keyword': /\b(?:assert|builtins|else|if|in|inherit|let|null|or|then|with)\b/,
	'function': /\b(?:abort|add|all|any|attrNames|attrValues|baseNameOf|compareVersions|concatLists|currentSystem|deepSeq|derivation|dirOf|div|elem(?:At)?|fetch(?:Tarball|url)|filter(?:Source)?|fromJSON|genList|getAttr|getEnv|hasAttr|hashString|head|import|intersectAttrs|is(?:Attrs|Bool|Function|Int|List|Null|String)|length|lessThan|listToAttrs|map|mul|parseDrvName|pathExists|read(?:Dir|File)|removeAttrs|replaceStrings|seq|sort|stringLength|sub(?:string)?|tail|throw|to(?:File|JSON|Path|String|XML)|trace|typeOf)\b|\bfoldl'\B/,
	'boolean': /\b(?:false|true)\b/,
	'operator': /[=!<>]=?|\+\+?|\|\||&&|\/\/|->?|[?@]/,
	'punctuation': /[{}()[\].,:;]/
};

Prism.languages.nix.string.inside.interpolation.inside = Prism.languages.nix;

// https://ocaml.org/manual/lex.html

Prism.languages.ocaml = {
	'comment': {
		pattern: /\(\*[\s\S]*?\*\)/,
		greedy: true
	},
	'char': {
		pattern: /'(?:[^\\\r\n']|\\(?:.|[ox]?[0-9a-f]{1,3}))'/i,
		greedy: true
	},
	'string': [
		{
			pattern: /"(?:\\(?:[\s\S]|\r\n)|[^\\\r\n"])*"/,
			greedy: true
		},
		{
			pattern: /\{([a-z_]*)\|[\s\S]*?\|\1\}/,
			greedy: true
		}
	],
	'number': [
		// binary and octal
		/\b(?:0b[01][01_]*|0o[0-7][0-7_]*)\b/i,
		// hexadecimal
		/\b0x[a-f0-9][a-f0-9_]*(?:\.[a-f0-9_]*)?(?:p[+-]?\d[\d_]*)?(?!\w)/i,
		// decimal
		/\b\d[\d_]*(?:\.[\d_]*)?(?:e[+-]?\d[\d_]*)?(?!\w)/i,
	],
	'directive': {
		pattern: /\B#\w+/,
		alias: 'property'
	},
	'label': {
		pattern: /\B~\w+/,
		alias: 'property'
	},
	'type-variable': {
		pattern: /\B'\w+/,
		alias: 'function'
	},
	'variant': {
		pattern: /`\w+/,
		alias: 'symbol'
	},
	// For the list of keywords and operators,
	// see: http://caml.inria.fr/pub/docs/manual-ocaml/lex.html#sec84
	'keyword': /\b(?:as|assert|begin|class|constraint|do|done|downto|else|end|exception|external|for|fun|function|functor|if|in|include|inherit|initializer|lazy|let|match|method|module|mutable|new|nonrec|object|of|open|private|rec|sig|struct|then|to|try|type|val|value|virtual|when|where|while|with)\b/,
	'boolean': /\b(?:false|true)\b/,

	'operator-like-punctuation': {
		pattern: /\[[<>|]|[>|]\]|\{<|>\}/,
		alias: 'punctuation'
	},
	// Custom operators are allowed
	'operator': /\.[.~]|:[=>]|[=<>@^|&+\-*\/$%!?~][!$%&*+\-.\/:<=>?@^|~]*|\b(?:and|asr|land|lor|lsl|lsr|lxor|mod|or)\b/,
	'punctuation': /;;|::|[(){}\[\].,:;#]|\b_\b/
};

(function (Prism) {

	var brackets = /(?:\((?:[^()\\]|\\[\s\S])*\)|\{(?:[^{}\\]|\\[\s\S])*\}|\[(?:[^[\]\\]|\\[\s\S])*\]|<(?:[^<>\\]|\\[\s\S])*>)/.source;

	Prism.languages.perl = {
		'comment': [
			{
				// POD
				pattern: /(^\s*)=\w[\s\S]*?=cut.*/m,
				lookbehind: true,
				greedy: true
			},
			{
				pattern: /(^|[^\\$])#.*/,
				lookbehind: true,
				greedy: true
			}
		],
		// TODO Could be nice to handle Heredoc too.
		'string': [
			{
				pattern: RegExp(
					/\b(?:q|qq|qw|qx)(?![a-zA-Z0-9])\s*/.source +
					'(?:' +
					[
						// q/.../
						/([^a-zA-Z0-9\s{(\[<])(?:(?!\1)[^\\]|\\[\s\S])*\1/.source,

						// q a...a
						// eslint-disable-next-line regexp/strict
						/([a-zA-Z0-9])(?:(?!\2)[^\\]|\\[\s\S])*\2/.source,

						// q(...)
						// q{...}
						// q[...]
						// q<...>
						brackets,
					].join('|') +
					')'
				),
				greedy: true
			},

			// "...", `...`
			{
				pattern: /("|`)(?:(?!\1)[^\\]|\\[\s\S])*\1/,
				greedy: true
			},

			// '...'
			// FIXME Multi-line single-quoted strings are not supported as they would break variables containing '
			{
				pattern: /'(?:[^'\\\r\n]|\\.)*'/,
				greedy: true
			}
		],
		'regex': [
			{
				pattern: RegExp(
					/\b(?:m|qr)(?![a-zA-Z0-9])\s*/.source +
					'(?:' +
					[
						// m/.../
						/([^a-zA-Z0-9\s{(\[<])(?:(?!\1)[^\\]|\\[\s\S])*\1/.source,

						// m a...a
						// eslint-disable-next-line regexp/strict
						/([a-zA-Z0-9])(?:(?!\2)[^\\]|\\[\s\S])*\2/.source,

						// m(...)
						// m{...}
						// m[...]
						// m<...>
						brackets,
					].join('|') +
					')' +
					/[msixpodualngc]*/.source
				),
				greedy: true
			},

			// The lookbehinds prevent -s from breaking
			{
				pattern: RegExp(
					/(^|[^-])\b(?:s|tr|y)(?![a-zA-Z0-9])\s*/.source +
					'(?:' +
					[
						// s/.../.../
						// eslint-disable-next-line regexp/strict
						/([^a-zA-Z0-9\s{(\[<])(?:(?!\2)[^\\]|\\[\s\S])*\2(?:(?!\2)[^\\]|\\[\s\S])*\2/.source,

						// s a...a...a
						// eslint-disable-next-line regexp/strict
						/([a-zA-Z0-9])(?:(?!\3)[^\\]|\\[\s\S])*\3(?:(?!\3)[^\\]|\\[\s\S])*\3/.source,

						// s(...)(...)
						// s{...}{...}
						// s[...][...]
						// s<...><...>
						// s(...)[...]
						brackets + /\s*/.source + brackets,
					].join('|') +
					')' +
					/[msixpodualngcer]*/.source
				),
				lookbehind: true,
				greedy: true
			},

			// /.../
			// The look-ahead tries to prevent two divisions on
			// the same line from being highlighted as regex.
			// This does not support multi-line regex.
			{
				pattern: /\/(?:[^\/\\\r\n]|\\.)*\/[msixpodualngc]*(?=\s*(?:$|[\r\n,.;})&|\-+*~<>!?^]|(?:and|cmp|eq|ge|gt|le|lt|ne|not|or|x|xor)\b))/,
				greedy: true
			}
		],

		// FIXME Not sure about the handling of ::, ', and #
		'variable': [
			// ${^POSTMATCH}
			/[&*$@%]\{\^[A-Z]+\}/,
			// $^V
			/[&*$@%]\^[A-Z_]/,
			// ${...}
			/[&*$@%]#?(?=\{)/,
			// $foo
			/[&*$@%]#?(?:(?:::)*'?(?!\d)[\w$]+(?![\w$]))+(?:::)*/,
			// $1
			/[&*$@%]\d+/,
			// $_, @_, %!
			// The negative lookahead prevents from breaking the %= operator
			/(?!%=)[$@%][!"#$%&'()*+,\-.\/:;<=>?@[\\\]^_`{|}~]/
		],
		'filehandle': {
			// <>, <FOO>, _
			pattern: /<(?![<=])\S*?>|\b_\b/,
			alias: 'symbol'
		},
		'v-string': {
			// v1.2, 1.2.3
			pattern: /v\d+(?:\.\d+)*|\d+(?:\.\d+){2,}/,
			alias: 'string'
		},
		'function': {
			pattern: /(\bsub[ \t]+)\w+/,
			lookbehind: true
		},
		'keyword': /\b(?:any|break|continue|default|delete|die|do|else|elsif|eval|for|foreach|given|goto|if|last|local|my|next|our|package|print|redo|require|return|say|state|sub|switch|undef|unless|until|use|when|while)\b/,
		'number': /\b(?:0x[\dA-Fa-f](?:_?[\dA-Fa-f])*|0b[01](?:_?[01])*|(?:(?:\d(?:_?\d)*)?\.)?\d(?:_?\d)*(?:[Ee][+-]?\d+)?)\b/,
		'operator': /-[rwxoRWXOezsfdlpSbctugkTBMAC]\b|\+[+=]?|-[-=>]?|\*\*?=?|\/\/?=?|=[=~>]?|~[~=]?|\|\|?=?|&&?=?|<(?:=>?|<=?)?|>>?=?|![~=]?|[%^]=?|\.(?:=|\.\.?)?|[\\?]|\bx(?:=|\b)|\b(?:and|cmp|eq|ge|gt|le|lt|ne|not|or|xor)\b/,
		'punctuation': /[{}[\];(),:]/
	};

}(Prism));

/**
 * Original by Aaron Harun: http://aahacreative.com/2012/07/31/php-syntax-highlighting-prism/
 * Modified by Miles Johnson: http://milesj.me
 * Rewritten by Tom Pavelec
 *
 * Supports PHP 5.3 - 8.0
 */
(function (Prism) {
	var comment = /\/\*[\s\S]*?\*\/|\/\/.*|#(?!\[).*/;
	var constant = [
		{
			pattern: /\b(?:false|true)\b/i,
			alias: 'boolean'
		},
		{
			pattern: /(::\s*)\b[a-z_]\w*\b(?!\s*\()/i,
			greedy: true,
			lookbehind: true,
		},
		{
			pattern: /(\b(?:case|const)\s+)\b[a-z_]\w*(?=\s*[;=])/i,
			greedy: true,
			lookbehind: true,
		},
		/\b(?:null)\b/i,
		/\b[A-Z_][A-Z0-9_]*\b(?!\s*\()/,
	];
	var number = /\b0b[01]+(?:_[01]+)*\b|\b0o[0-7]+(?:_[0-7]+)*\b|\b0x[\da-f]+(?:_[\da-f]+)*\b|(?:\b\d+(?:_\d+)*\.?(?:\d+(?:_\d+)*)?|\B\.\d+)(?:e[+-]?\d+)?/i;
	var operator = /<?=>|\?\?=?|\.{3}|\??->|[!=]=?=?|::|\*\*=?|--|\+\+|&&|\|\||<<|>>|[?~]|[/^|%*&<>.+-]=?/;
	var punctuation = /[{}\[\](),:;]/;

	Prism.languages.php = {
		'delimiter': {
			pattern: /\?>$|^<\?(?:php(?=\s)|=)?/i,
			alias: 'important'
		},
		'comment': comment,
		'variable': /\$+(?:\w+\b|(?=\{))/,
		'package': {
			pattern: /(namespace\s+|use\s+(?:function\s+)?)(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,
			lookbehind: true,
			inside: {
				'punctuation': /\\/
			}
		},
		'class-name-definition': {
			pattern: /(\b(?:class|enum|interface|trait)\s+)\b[a-z_]\w*(?!\\)\b/i,
			lookbehind: true,
			alias: 'class-name'
		},
		'function-definition': {
			pattern: /(\bfunction\s+)[a-z_]\w*(?=\s*\()/i,
			lookbehind: true,
			alias: 'function'
		},
		'keyword': [
			{
				pattern: /(\(\s*)\b(?:array|bool|boolean|float|int|integer|object|string)\b(?=\s*\))/i,
				alias: 'type-casting',
				greedy: true,
				lookbehind: true
			},
			{
				pattern: /([(,?]\s*)\b(?:array(?!\s*\()|bool|callable|(?:false|null)(?=\s*\|)|float|int|iterable|mixed|object|self|static|string)\b(?=\s*\$)/i,
				alias: 'type-hint',
				greedy: true,
				lookbehind: true
			},
			{
				pattern: /(\)\s*:\s*(?:\?\s*)?)\b(?:array(?!\s*\()|bool|callable|(?:false|null)(?=\s*\|)|float|int|iterable|mixed|never|object|self|static|string|void)\b/i,
				alias: 'return-type',
				greedy: true,
				lookbehind: true
			},
			{
				pattern: /\b(?:array(?!\s*\()|bool|float|int|iterable|mixed|object|string|void)\b/i,
				alias: 'type-declaration',
				greedy: true
			},
			{
				pattern: /(\|\s*)(?:false|null)\b|\b(?:false|null)(?=\s*\|)/i,
				alias: 'type-declaration',
				greedy: true,
				lookbehind: true
			},
			{
				pattern: /\b(?:parent|self|static)(?=\s*::)/i,
				alias: 'static-context',
				greedy: true
			},
			{
				// yield from
				pattern: /(\byield\s+)from\b/i,
				lookbehind: true
			},
			// `class` is always a keyword unlike other keywords
			/\bclass\b/i,
			{
				// https://www.php.net/manual/en/reserved.keywords.php
				//
				// keywords cannot be preceded by "->"
				// the complex lookbehind means `(?<!(?:->|::)\s*)`
				pattern: /((?:^|[^\s>:]|(?:^|[^-])>|(?:^|[^:]):)\s*)\b(?:abstract|and|array|as|break|callable|case|catch|clone|const|continue|declare|default|die|do|echo|else|elseif|empty|enddeclare|endfor|endforeach|endif|endswitch|endwhile|enum|eval|exit|extends|final|finally|fn|for|foreach|function|global|goto|if|implements|include|include_once|instanceof|insteadof|interface|isset|list|match|namespace|never|new|or|parent|print|private|protected|public|readonly|require|require_once|return|self|static|switch|throw|trait|try|unset|use|var|while|xor|yield|__halt_compiler)\b/i,
				lookbehind: true
			}
		],
		'argument-name': {
			pattern: /([(,]\s*)\b[a-z_]\w*(?=\s*:(?!:))/i,
			lookbehind: true
		},
		'class-name': [
			{
				pattern: /(\b(?:extends|implements|instanceof|new(?!\s+self|\s+static))\s+|\bcatch\s*\()\b[a-z_]\w*(?!\\)\b/i,
				greedy: true,
				lookbehind: true
			},
			{
				pattern: /(\|\s*)\b[a-z_]\w*(?!\\)\b/i,
				greedy: true,
				lookbehind: true
			},
			{
				pattern: /\b[a-z_]\w*(?!\\)\b(?=\s*\|)/i,
				greedy: true
			},
			{
				pattern: /(\|\s*)(?:\\?\b[a-z_]\w*)+\b/i,
				alias: 'class-name-fully-qualified',
				greedy: true,
				lookbehind: true,
				inside: {
					'punctuation': /\\/
				}
			},
			{
				pattern: /(?:\\?\b[a-z_]\w*)+\b(?=\s*\|)/i,
				alias: 'class-name-fully-qualified',
				greedy: true,
				inside: {
					'punctuation': /\\/
				}
			},
			{
				pattern: /(\b(?:extends|implements|instanceof|new(?!\s+self\b|\s+static\b))\s+|\bcatch\s*\()(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,
				alias: 'class-name-fully-qualified',
				greedy: true,
				lookbehind: true,
				inside: {
					'punctuation': /\\/
				}
			},
			{
				pattern: /\b[a-z_]\w*(?=\s*\$)/i,
				alias: 'type-declaration',
				greedy: true
			},
			{
				pattern: /(?:\\?\b[a-z_]\w*)+(?=\s*\$)/i,
				alias: ['class-name-fully-qualified', 'type-declaration'],
				greedy: true,
				inside: {
					'punctuation': /\\/
				}
			},
			{
				pattern: /\b[a-z_]\w*(?=\s*::)/i,
				alias: 'static-context',
				greedy: true
			},
			{
				pattern: /(?:\\?\b[a-z_]\w*)+(?=\s*::)/i,
				alias: ['class-name-fully-qualified', 'static-context'],
				greedy: true,
				inside: {
					'punctuation': /\\/
				}
			},
			{
				pattern: /([(,?]\s*)[a-z_]\w*(?=\s*\$)/i,
				alias: 'type-hint',
				greedy: true,
				lookbehind: true
			},
			{
				pattern: /([(,?]\s*)(?:\\?\b[a-z_]\w*)+(?=\s*\$)/i,
				alias: ['class-name-fully-qualified', 'type-hint'],
				greedy: true,
				lookbehind: true,
				inside: {
					'punctuation': /\\/
				}
			},
			{
				pattern: /(\)\s*:\s*(?:\?\s*)?)\b[a-z_]\w*(?!\\)\b/i,
				alias: 'return-type',
				greedy: true,
				lookbehind: true
			},
			{
				pattern: /(\)\s*:\s*(?:\?\s*)?)(?:\\?\b[a-z_]\w*)+\b(?!\\)/i,
				alias: ['class-name-fully-qualified', 'return-type'],
				greedy: true,
				lookbehind: true,
				inside: {
					'punctuation': /\\/
				}
			}
		],
		'constant': constant,
		'function': {
			pattern: /(^|[^\\\w])\\?[a-z_](?:[\w\\]*\w)?(?=\s*\()/i,
			lookbehind: true,
			inside: {
				'punctuation': /\\/
			}
		},
		'property': {
			pattern: /(->\s*)\w+/,
			lookbehind: true
		},
		'number': number,
		'operator': operator,
		'punctuation': punctuation
	};

	var string_interpolation = {
		pattern: /\{\$(?:\{(?:\{[^{}]+\}|[^{}]+)\}|[^{}])+\}|(^|[^\\{])\$+(?:\w+(?:\[[^\r\n\[\]]+\]|->\w+)?)/,
		lookbehind: true,
		inside: Prism.languages.php
	};

	var string = [
		{
			pattern: /<<<'([^']+)'[\r\n](?:.*[\r\n])*?\1;/,
			alias: 'nowdoc-string',
			greedy: true,
			inside: {
				'delimiter': {
					pattern: /^<<<'[^']+'|[a-z_]\w*;$/i,
					alias: 'symbol',
					inside: {
						'punctuation': /^<<<'?|[';]$/
					}
				}
			}
		},
		{
			pattern: /<<<(?:"([^"]+)"[\r\n](?:.*[\r\n])*?\1;|([a-z_]\w*)[\r\n](?:.*[\r\n])*?\2;)/i,
			alias: 'heredoc-string',
			greedy: true,
			inside: {
				'delimiter': {
					pattern: /^<<<(?:"[^"]+"|[a-z_]\w*)|[a-z_]\w*;$/i,
					alias: 'symbol',
					inside: {
						'punctuation': /^<<<"?|[";]$/
					}
				},
				'interpolation': string_interpolation
			}
		},
		{
			pattern: /`(?:\\[\s\S]|[^\\`])*`/,
			alias: 'backtick-quoted-string',
			greedy: true
		},
		{
			pattern: /'(?:\\[\s\S]|[^\\'])*'/,
			alias: 'single-quoted-string',
			greedy: true
		},
		{
			pattern: /"(?:\\[\s\S]|[^\\"])*"/,
			alias: 'double-quoted-string',
			greedy: true,
			inside: {
				'interpolation': string_interpolation
			}
		}
	];

	Prism.languages.insertBefore('php', 'variable', {
		'string': string,
		'attribute': {
			pattern: /#\[(?:[^"'\/#]|\/(?![*/])|\/\/.*$|#(?!\[).*$|\/\*(?:[^*]|\*(?!\/))*\*\/|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*')+\](?=\s*[a-z$#])/im,
			greedy: true,
			inside: {
				'attribute-content': {
					pattern: /^(#\[)[\s\S]+(?=\]$)/,
					lookbehind: true,
					// inside can appear subset of php
					inside: {
						'comment': comment,
						'string': string,
						'attribute-class-name': [
							{
								pattern: /([^:]|^)\b[a-z_]\w*(?!\\)\b/i,
								alias: 'class-name',
								greedy: true,
								lookbehind: true
							},
							{
								pattern: /([^:]|^)(?:\\?\b[a-z_]\w*)+/i,
								alias: [
									'class-name',
									'class-name-fully-qualified'
								],
								greedy: true,
								lookbehind: true,
								inside: {
									'punctuation': /\\/
								}
							}
						],
						'constant': constant,
						'number': number,
						'operator': operator,
						'punctuation': punctuation
					}
				},
				'delimiter': {
					pattern: /^#\[|\]$/,
					alias: 'punctuation'
				}
			}
		},
	});

	Prism.hooks.add('before-tokenize', function (env) {
		if (!/<\?/.test(env.code)) {
			return;
		}

		var phpPattern = /<\?(?:[^"'/#]|\/(?![*/])|("|')(?:\\[\s\S]|(?!\1)[^\\])*\1|(?:\/\/|#(?!\[))(?:[^?\n\r]|\?(?!>))*(?=$|\?>|[\r\n])|#\[|\/\*(?:[^*]|\*(?!\/))*(?:\*\/|$))*?(?:\?>|$)/g;
		Prism.languages['markup-templating'].buildPlaceholders(env, 'php', phpPattern);
	});

	Prism.hooks.add('after-tokenize', function (env) {
		Prism.languages['markup-templating'].tokenizePlaceholders(env, 'php');
	});

}(Prism));

Prism.languages.python = {
	'comment': {
		pattern: /(^|[^\\])#.*/,
		lookbehind: true,
		greedy: true
	},
	'string-interpolation': {
		pattern: /(?:f|fr|rf)(?:("""|''')[\s\S]*?\1|("|')(?:\\.|(?!\2)[^\\\r\n])*\2)/i,
		greedy: true,
		inside: {
			'interpolation': {
				// "{" <expression> <optional "!s", "!r", or "!a"> <optional ":" format specifier> "}"
				pattern: /((?:^|[^{])(?:\{\{)*)\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}]|\{(?!\{)(?:[^{}])+\})+\})+\}/,
				lookbehind: true,
				inside: {
					'format-spec': {
						pattern: /(:)[^:(){}]+(?=\}$)/,
						lookbehind: true
					},
					'conversion-option': {
						pattern: /![sra](?=[:}]$)/,
						alias: 'punctuation'
					},
					rest: null
				}
			},
			'string': /[\s\S]+/
		}
	},
	'triple-quoted-string': {
		pattern: /(?:[rub]|br|rb)?("""|''')[\s\S]*?\1/i,
		greedy: true,
		alias: 'string'
	},
	'string': {
		pattern: /(?:[rub]|br|rb)?("|')(?:\\.|(?!\1)[^\\\r\n])*\1/i,
		greedy: true
	},
	'function': {
		pattern: /((?:^|\s)def[ \t]+)[a-zA-Z_]\w*(?=\s*\()/g,
		lookbehind: true
	},
	'class-name': {
		pattern: /(\bclass\s+)\w+/i,
		lookbehind: true
	},
	'decorator': {
		pattern: /(^[\t ]*)@\w+(?:\.\w+)*/m,
		lookbehind: true,
		alias: ['annotation', 'punctuation'],
		inside: {
			'punctuation': /\./
		}
	},
	'keyword': /\b(?:_(?=\s*:)|and|as|assert|async|await|break|case|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|not|or|pass|print|raise|return|try|while|with|yield)\b/,
	'builtin': /\b(?:__import__|abs|all|any|apply|ascii|basestring|bin|bool|buffer|bytearray|bytes|callable|chr|classmethod|cmp|coerce|compile|complex|delattr|dict|dir|divmod|enumerate|eval|execfile|file|filter|float|format|frozenset|getattr|globals|hasattr|hash|help|hex|id|input|int|intern|isinstance|issubclass|iter|len|list|locals|long|map|max|memoryview|min|next|object|oct|open|ord|pow|property|range|raw_input|reduce|reload|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|unichr|unicode|vars|xrange|zip)\b/,
	'boolean': /\b(?:False|None|True)\b/,
	'number': /\b0(?:b(?:_?[01])+|o(?:_?[0-7])+|x(?:_?[a-f0-9])+)\b|(?:\b\d+(?:_\d+)*(?:\.(?:\d+(?:_\d+)*)?)?|\B\.\d+(?:_\d+)*)(?:e[+-]?\d+(?:_\d+)*)?j?(?!\w)/i,
	'operator': /[-+%=]=?|!=|:=|\*\*?=?|\/\/?=?|<[<=>]?|>[=>]?|[&|^~]/,
	'punctuation': /[{}[\];(),.:]/
};

Prism.languages.python['string-interpolation'].inside['interpolation'].inside.rest = Prism.languages.python;

Prism.languages.py = Prism.languages.python;

(function (Prism) {

	var jsString = /"(?:\\.|[^\\"\r\n])*"|'(?:\\.|[^\\'\r\n])*'/.source;
	var jsComment = /\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))*\*\//.source;

	var jsExpr = /(?:[^\\()[\]{}"'/]|<string>|\/(?![*/])|<comment>|\(<expr>*\)|\[<expr>*\]|\{<expr>*\}|\\[\s\S])/
		.source.replace(/<string>/g, function () { return jsString; }).replace(/<comment>/g, function () { return jsComment; });

	// the pattern will blow up, so only a few iterations
	for (var i = 0; i < 2; i++) {
		jsExpr = jsExpr.replace(/<expr>/g, function () { return jsExpr; });
	}
	jsExpr = jsExpr.replace(/<expr>/g, '[^\\s\\S]');


	Prism.languages.qml = {
		'comment': {
			pattern: /\/\/.*|\/\*[\s\S]*?\*\//,
			greedy: true
		},
		'javascript-function': {
			pattern: RegExp(/((?:^|;)[ \t]*)function\s+(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*\(<js>*\)\s*\{<js>*\}/.source.replace(/<js>/g, function () { return jsExpr; }), 'm'),
			lookbehind: true,
			greedy: true,
			alias: 'language-javascript',
			inside: Prism.languages.javascript
		},
		'class-name': {
			pattern: /((?:^|[:;])[ \t]*)(?!\d)\w+(?=[ \t]*\{|[ \t]+on\b)/m,
			lookbehind: true
		},
		'property': [
			{
				pattern: /((?:^|[;{])[ \t]*)(?!\d)\w+(?:\.\w+)*(?=[ \t]*:)/m,
				lookbehind: true
			},
			{
				pattern: /((?:^|[;{])[ \t]*)property[ \t]+(?!\d)\w+(?:\.\w+)*[ \t]+(?!\d)\w+(?:\.\w+)*(?=[ \t]*:)/m,
				lookbehind: true,
				inside: {
					'keyword': /^property/,
					'property': /\w+(?:\.\w+)*/
				}
			}
		],
		'javascript-expression': {
			pattern: RegExp(/(:[ \t]*)(?![\s;}[])(?:(?!$|[;}])<js>)+/.source.replace(/<js>/g, function () { return jsExpr; }), 'm'),
			lookbehind: true,
			greedy: true,
			alias: 'language-javascript',
			inside: Prism.languages.javascript
		},
		'string': {
			pattern: /"(?:\\.|[^\\"\r\n])*"/,
			greedy: true
		},
		'keyword': /\b(?:as|import|on)\b/,
		'punctuation': /[{}[\]:;,]/
	};

}(Prism));

Prism.languages.r = {
	'comment': /#.*/,
	'string': {
		pattern: /(['"])(?:\\.|(?!\1)[^\\\r\n])*\1/,
		greedy: true
	},
	'percent-operator': {
		// Includes user-defined operators
		// and %%, %*%, %/%, %in%, %o%, %x%
		pattern: /%[^%\s]*%/,
		alias: 'operator'
	},
	'boolean': /\b(?:FALSE|TRUE)\b/,
	'ellipsis': /\.\.(?:\.|\d+)/,
	'number': [
		/\b(?:Inf|NaN)\b/,
		/(?:\b0x[\dA-Fa-f]+(?:\.\d*)?|\b\d+(?:\.\d*)?|\B\.\d+)(?:[EePp][+-]?\d+)?[iL]?/
	],
	'keyword': /\b(?:NA|NA_character_|NA_complex_|NA_integer_|NA_real_|NULL|break|else|for|function|if|in|next|repeat|while)\b/,
	'operator': /->?>?|<(?:=|<?-)?|[>=!]=?|::?|&&?|\|\|?|[+*\/^$@~]/,
	'punctuation': /[(){}\[\],;]/
};

(function (Prism) {

	var javascript = Prism.util.clone(Prism.languages.javascript);

	var space = /(?:\s|\/\/.*(?!.)|\/\*(?:[^*]|\*(?!\/))\*\/)/.source;
	var braces = /(?:\{(?:\{(?:\{[^{}]*\}|[^{}])*\}|[^{}])*\})/.source;
	var spread = /(?:\{<S>*\.{3}(?:[^{}]|<BRACES>)*\})/.source;

	/**
	 * @param {string} source
	 * @param {string} [flags]
	 */
	function re(source, flags) {
		source = source
			.replace(/<S>/g, function () { return space; })
			.replace(/<BRACES>/g, function () { return braces; })
			.replace(/<SPREAD>/g, function () { return spread; });
		return RegExp(source, flags);
	}

	spread = re(spread).source;


	Prism.languages.jsx = Prism.languages.extend('markup', javascript);
	Prism.languages.jsx.tag.pattern = re(
		/<\/?(?:[\w.:-]+(?:<S>+(?:[\w.:$-]+(?:=(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s{'"/>=]+|<BRACES>))?|<SPREAD>))*<S>*\/?)?>/.source
	);

	Prism.languages.jsx.tag.inside['tag'].pattern = /^<\/?[^\s>\/]*/;
	Prism.languages.jsx.tag.inside['attr-value'].pattern = /=(?!\{)(?:"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'|[^\s'">]+)/;
	Prism.languages.jsx.tag.inside['tag'].inside['class-name'] = /^[A-Z]\w*(?:\.[A-Z]\w*)*$/;
	Prism.languages.jsx.tag.inside['comment'] = javascript['comment'];

	Prism.languages.insertBefore('inside', 'attr-name', {
		'spread': {
			pattern: re(/<SPREAD>/.source),
			inside: Prism.languages.jsx
		}
	}, Prism.languages.jsx.tag);

	Prism.languages.insertBefore('inside', 'special-attr', {
		'script': {
			// Allow for two levels of nesting
			pattern: re(/=<BRACES>/.source),
			alias: 'language-javascript',
			inside: {
				'script-punctuation': {
					pattern: /^=(?=\{)/,
					alias: 'punctuation'
				},
				rest: Prism.languages.jsx
			},
		}
	}, Prism.languages.jsx.tag);

	// The following will handle plain text inside tags
	var stringifyToken = function (token) {
		if (!token) {
			return '';
		}
		if (typeof token === 'string') {
			return token;
		}
		if (typeof token.content === 'string') {
			return token.content;
		}
		return token.content.map(stringifyToken).join('');
	};

	var walkTokens = function (tokens) {
		var openedTags = [];
		for (var i = 0; i < tokens.length; i++) {
			var token = tokens[i];
			var notTagNorBrace = false;

			if (typeof token !== 'string') {
				if (token.type === 'tag' && token.content[0] && token.content[0].type === 'tag') {
					// We found a tag, now find its kind

					if (token.content[0].content[0].content === '</') {
						// Closing tag
						if (openedTags.length > 0 && openedTags[openedTags.length - 1].tagName === stringifyToken(token.content[0].content[1])) {
							// Pop matching opening tag
							openedTags.pop();
						}
					} else {
						if (token.content[token.content.length - 1].content === '/>') {
							// Autoclosed tag, ignore
						} else {
							// Opening tag
							openedTags.push({
								tagName: stringifyToken(token.content[0].content[1]),
								openedBraces: 0
							});
						}
					}
				} else if (openedTags.length > 0 && token.type === 'punctuation' && token.content === '{') {

					// Here we might have entered a JSX context inside a tag
					openedTags[openedTags.length - 1].openedBraces++;

				} else if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces > 0 && token.type === 'punctuation' && token.content === '}') {

					// Here we might have left a JSX context inside a tag
					openedTags[openedTags.length - 1].openedBraces--;

				} else {
					notTagNorBrace = true;
				}
			}
			if (notTagNorBrace || typeof token === 'string') {
				if (openedTags.length > 0 && openedTags[openedTags.length - 1].openedBraces === 0) {
					// Here we are inside a tag, and not inside a JSX context.
					// That's plain text: drop any tokens matched.
					var plainText = stringifyToken(token);

					// And merge text with adjacent text
					if (i < tokens.length - 1 && (typeof tokens[i + 1] === 'string' || tokens[i + 1].type === 'plain-text')) {
						plainText += stringifyToken(tokens[i + 1]);
						tokens.splice(i + 1, 1);
					}
					if (i > 0 && (typeof tokens[i - 1] === 'string' || tokens[i - 1].type === 'plain-text')) {
						plainText = stringifyToken(tokens[i - 1]) + plainText;
						tokens.splice(i - 1, 1);
						i--;
					}

					tokens[i] = new Prism.Token('plain-text', plainText, null, plainText);
				}
			}

			if (token.content && typeof token.content !== 'string') {
				walkTokens(token.content);
			}
		}
	};

	Prism.hooks.add('after-tokenize', function (env) {
		if (env.language !== 'jsx' && env.language !== 'tsx') {
			return;
		}
		walkTokens(env.tokens);
	});

}(Prism));

(function (Prism) {

	var multilineComment = /\/\*(?:[^*/]|\*(?!\/)|\/(?!\*)|<self>)*\*\//.source;
	for (var i = 0; i < 2; i++) {
		// support 4 levels of nested comments
		multilineComment = multilineComment.replace(/<self>/g, function () { return multilineComment; });
	}
	multilineComment = multilineComment.replace(/<self>/g, function () { return /[^\s\S]/.source; });


	Prism.languages.rust = {
		'comment': [
			{
				pattern: RegExp(/(^|[^\\])/.source + multilineComment),
				lookbehind: true,
				greedy: true
			},
			{
				pattern: /(^|[^\\:])\/\/.*/,
				lookbehind: true,
				greedy: true
			}
		],
		'string': {
			pattern: /b?"(?:\\[\s\S]|[^\\"])*"|b?r(#*)"(?:[^"]|"(?!\1))*"\1/,
			greedy: true
		},
		'char': {
			pattern: /b?'(?:\\(?:x[0-7][\da-fA-F]|u\{(?:[\da-fA-F]_*){1,6}\}|.)|[^\\\r\n\t'])'/,
			greedy: true
		},
		'attribute': {
			pattern: /#!?\[(?:[^\[\]"]|"(?:\\[\s\S]|[^\\"])*")*\]/,
			greedy: true,
			alias: 'attr-name',
			inside: {
				'string': null // see below
			}
		},

		// Closure params should not be confused with bitwise OR |
		'closure-params': {
			pattern: /([=(,:]\s*|\bmove\s*)\|[^|]*\||\|[^|]*\|(?=\s*(?:\{|->))/,
			lookbehind: true,
			greedy: true,
			inside: {
				'closure-punctuation': {
					pattern: /^\||\|$/,
					alias: 'punctuation'
				},
				rest: null // see below
			}
		},

		'lifetime-annotation': {
			pattern: /'\w+/,
			alias: 'symbol'
		},

		'fragment-specifier': {
			pattern: /(\$\w+:)[a-z]+/,
			lookbehind: true,
			alias: 'punctuation'
		},
		'variable': /\$\w+/,

		'function-definition': {
			pattern: /(\bfn\s+)\w+/,
			lookbehind: true,
			alias: 'function'
		},
		'type-definition': {
			pattern: /(\b(?:enum|struct|trait|type|union)\s+)\w+/,
			lookbehind: true,
			alias: 'class-name'
		},
		'module-declaration': [
			{
				pattern: /(\b(?:crate|mod)\s+)[a-z][a-z_\d]*/,
				lookbehind: true,
				alias: 'namespace'
			},
			{
				pattern: /(\b(?:crate|self|super)\s*)::\s*[a-z][a-z_\d]*\b(?:\s*::(?:\s*[a-z][a-z_\d]*\s*::)*)?/,
				lookbehind: true,
				alias: 'namespace',
				inside: {
					'punctuation': /::/
				}
			}
		],
		'keyword': [
			// https://github.com/rust-lang/reference/blob/master/src/keywords.md
			/\b(?:Self|abstract|as|async|await|become|box|break|const|continue|crate|do|dyn|else|enum|extern|final|fn|for|if|impl|in|let|loop|macro|match|mod|move|mut|override|priv|pub|ref|return|self|static|struct|super|trait|try|type|typeof|union|unsafe|unsized|use|virtual|where|while|yield)\b/,
			// primitives and str
			// https://doc.rust-lang.org/stable/rust-by-example/primitives.html
			/\b(?:bool|char|f(?:32|64)|[ui](?:8|16|32|64|128|size)|str)\b/
		],

		// functions can technically start with an upper-case letter, but this will introduce a lot of false positives
		// and Rust's naming conventions recommend snake_case anyway.
		// https://doc.rust-lang.org/1.0.0/style/style/naming/README.html
		'function': /\b[a-z_]\w*(?=\s*(?:::\s*<|\())/,
		'macro': {
			pattern: /\b\w+!/,
			alias: 'property'
		},
		'constant': /\b[A-Z_][A-Z_\d]+\b/,
		'class-name': /\b[A-Z]\w*\b/,

		'namespace': {
			pattern: /(?:\b[a-z][a-z_\d]*\s*::\s*)*\b[a-z][a-z_\d]*\s*::(?!\s*<)/,
			inside: {
				'punctuation': /::/
			}
		},

		// Hex, oct, bin, dec numbers with visual separators and type suffix
		'number': /\b(?:0x[\dA-Fa-f](?:_?[\dA-Fa-f])*|0o[0-7](?:_?[0-7])*|0b[01](?:_?[01])*|(?:(?:\d(?:_?\d)*)?\.)?\d(?:_?\d)*(?:[Ee][+-]?\d+)?)(?:_?(?:f32|f64|[iu](?:8|16|32|64|size)?))?\b/,
		'boolean': /\b(?:false|true)\b/,
		'punctuation': /->|\.\.=|\.{1,3}|::|[{}[\];(),:]/,
		'operator': /[-+*\/%!^]=?|=[=>]?|&[&=]?|\|[|=]?|<<?=?|>>?=?|[@?]/
	};

	Prism.languages.rust['closure-params'].inside.rest = Prism.languages.rust;
	Prism.languages.rust['attribute'].inside['string'] = Prism.languages.rust['string'];

}(Prism));

Prism.languages.scss = Prism.languages.extend('css', {
	'comment': {
		pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|\/\/.*)/,
		lookbehind: true
	},
	'atrule': {
		pattern: /@[\w-](?:\([^()]+\)|[^()\s]|\s+(?!\s))*?(?=\s+[{;])/,
		inside: {
			'rule': /@[\w-]+/
			// See rest below
		}
	},
	// url, compassified
	'url': /(?:[-a-z]+-)?url(?=\()/i,
	// CSS selector regex is not appropriate for Sass
	// since there can be lot more things (var, @ directive, nesting..)
	// a selector must start at the end of a property or after a brace (end of other rules or nesting)
	// it can contain some characters that aren't used for defining rules or end of selector, & (parent selector), or interpolated variable
	// the end of a selector is found when there is no rules in it ( {} or {\s}) or if there is a property (because an interpolated var
	// can "pass" as a selector- e.g: proper#{$erty})
	// this one was hard to do, so please be careful if you edit this one :)
	'selector': {
		// Initial look-ahead is used to prevent matching of blank selectors
		pattern: /(?=\S)[^@;{}()]?(?:[^@;{}()\s]|\s+(?!\s)|#\{\$[-\w]+\})+(?=\s*\{(?:\}|\s|[^}][^:{}]*[:{][^}]))/,
		inside: {
			'parent': {
				pattern: /&/,
				alias: 'important'
			},
			'placeholder': /%[-\w]+/,
			'variable': /\$[-\w]+|#\{\$[-\w]+\}/
		}
	},
	'property': {
		pattern: /(?:[-\w]|\$[-\w]|#\{\$[-\w]+\})+(?=\s*:)/,
		inside: {
			'variable': /\$[-\w]+|#\{\$[-\w]+\}/
		}
	}
});

Prism.languages.insertBefore('scss', 'atrule', {
	'keyword': [
		/@(?:content|debug|each|else(?: if)?|extend|for|forward|function|if|import|include|mixin|return|use|warn|while)\b/i,
		{
			pattern: /( )(?:from|through)(?= )/,
			lookbehind: true
		}
	]
});

Prism.languages.insertBefore('scss', 'important', {
	// var and interpolated vars
	'variable': /\$[-\w]+|#\{\$[-\w]+\}/
});

Prism.languages.insertBefore('scss', 'function', {
	'module-modifier': {
		pattern: /\b(?:as|hide|show|with)\b/i,
		alias: 'keyword'
	},
	'placeholder': {
		pattern: /%[-\w]+/,
		alias: 'selector'
	},
	'statement': {
		pattern: /\B!(?:default|optional)\b/i,
		alias: 'keyword'
	},
	'boolean': /\b(?:false|true)\b/,
	'null': {
		pattern: /\bnull\b/,
		alias: 'keyword'
	},
	'operator': {
		pattern: /(\s)(?:[-+*\/%]|[=!]=|<=?|>=?|and|not|or)(?=\s)/,
		lookbehind: true
	}
});

Prism.languages.scss['atrule'].inside.rest = Prism.languages.scss;

Prism.languages.scala = Prism.languages.extend('java', {
	'triple-quoted-string': {
		pattern: /"""[\s\S]*?"""/,
		greedy: true,
		alias: 'string'
	},
	'string': {
		pattern: /("|')(?:\\.|(?!\1)[^\\\r\n])*\1/,
		greedy: true
	},
	'keyword': /<-|=>|\b(?:abstract|case|catch|class|def|derives|do|else|enum|extends|extension|final|finally|for|forSome|given|if|implicit|import|infix|inline|lazy|match|new|null|object|opaque|open|override|package|private|protected|return|sealed|self|super|this|throw|trait|transparent|try|type|using|val|var|while|with|yield)\b/,
	'number': /\b0x(?:[\da-f]*\.)?[\da-f]+|(?:\b\d+(?:\.\d*)?|\B\.\d+)(?:e\d+)?[dfl]?/i,
	'builtin': /\b(?:Any|AnyRef|AnyVal|Boolean|Byte|Char|Double|Float|Int|Long|Nothing|Short|String|Unit)\b/,
	'symbol': /'[^\d\s\\]\w*/
});

Prism.languages.insertBefore('scala', 'triple-quoted-string', {
	'string-interpolation': {
		pattern: /\b[a-z]\w*(?:"""(?:[^$]|\$(?:[^{]|\{(?:[^{}]|\{[^{}]*\})*\}))*?"""|"(?:[^$"\r\n]|\$(?:[^{]|\{(?:[^{}]|\{[^{}]*\})*\}))*")/i,
		greedy: true,
		inside: {
			'id': {
				pattern: /^\w+/,
				greedy: true,
				alias: 'function'
			},
			'escape': {
				pattern: /\\\$"|\$[$"]/,
				greedy: true,
				alias: 'symbol'
			},
			'interpolation': {
				pattern: /\$(?:\w+|\{(?:[^{}]|\{[^{}]*\})*\})/,
				greedy: true,
				inside: {
					'punctuation': /^\$\{?|\}$/,
					'expression': {
						pattern: /[\s\S]+/,
						inside: Prism.languages.scala
					}
				}
			},
			'string': /[\s\S]+/
		}
	}
});

delete Prism.languages.scala['class-name'];
delete Prism.languages.scala['function'];
delete Prism.languages.scala['constant'];

(function (Prism) {

	// CAREFUL!
	// The following patterns are concatenated, so the group referenced by a back reference is non-obvious!

	var strings = [
		// normal string
		/"(?:\\[\s\S]|\$\([^)]+\)|\$(?!\()|`[^`]+`|[^"\\`$])*"/.source,
		/'[^']*'/.source,
		/\$'(?:[^'\\]|\\[\s\S])*'/.source,

		// here doc
		// 2 capturing groups
		/<<-?\s*(["']?)(\w+)\1\s[\s\S]*?[\r\n]\2/.source
	].join('|');

	Prism.languages['shell-session'] = {
		'command': {
			pattern: RegExp(
				// user info
				/^/.source +
				'(?:' +
				(
					// <user> ":" ( <path> )?
					/[^\s@:$#%*!/\\]+@[^\r\n@:$#%*!/\\]+(?::[^\0-\x1F$#%*?"<>:;|]+)?/.source +
					'|' +
					// <path>
					// Since the path pattern is quite general, we will require it to start with a special character to
					// prevent false positives.
					/[/~.][^\0-\x1F$#%*?"<>@:;|]*/.source
				) +
				')?' +
				// shell symbol
				/[$#%](?=\s)/.source +
				// bash command
				/(?:[^\\\r\n \t'"<$]|[ \t](?:(?!#)|#.*$)|\\(?:[^\r]|\r\n?)|\$(?!')|<(?!<)|<<str>>)+/.source.replace(/<<str>>/g, function () { return strings; }),
				'm'
			),
			greedy: true,
			inside: {
				'info': {
					// foo@bar:~/files$ exit
					// foo@bar$ exit
					// ~/files$ exit
					pattern: /^[^#$%]+/,
					alias: 'punctuation',
					inside: {
						'user': /^[^\s@:$#%*!/\\]+@[^\r\n@:$#%*!/\\]+/,
						'punctuation': /:/,
						'path': /[\s\S]+/
					}
				},
				'bash': {
					pattern: /(^[$#%]\s*)\S[\s\S]*/,
					lookbehind: true,
					alias: 'language-bash',
					inside: Prism.languages.bash
				},
				'shell-symbol': {
					pattern: /^[$#%]/,
					alias: 'important'
				}
			}
		},
		'output': /.(?:.*(?:[\r\n]|.$))*/
	};

	Prism.languages['sh-session'] = Prism.languages['shellsession'] = Prism.languages['shell-session'];

}(Prism));

Prism.languages.sql = {
	'comment': {
		pattern: /(^|[^\\])(?:\/\*[\s\S]*?\*\/|(?:--|\/\/|#).*)/,
		lookbehind: true
	},
	'variable': [
		{
			pattern: /@(["'`])(?:\\[\s\S]|(?!\1)[^\\])+\1/,
			greedy: true
		},
		/@[\w.$]+/
	],
	'string': {
		pattern: /(^|[^@\\])("|')(?:\\[\s\S]|(?!\2)[^\\]|\2\2)*\2/,
		greedy: true,
		lookbehind: true
	},
	'identifier': {
		pattern: /(^|[^@\\])`(?:\\[\s\S]|[^`\\]|``)*`/,
		greedy: true,
		lookbehind: true,
		inside: {
			'punctuation': /^`|`$/
		}
	},
	'function': /\b(?:AVG|COUNT|FIRST|FORMAT|LAST|LCASE|LEN|MAX|MID|MIN|MOD|NOW|ROUND|SUM|UCASE)(?=\s*\()/i, // Should we highlight user defined functions too?
	'keyword': /\b(?:ACTION|ADD|AFTER|ALGORITHM|ALL|ALTER|ANALYZE|ANY|APPLY|AS|ASC|AUTHORIZATION|AUTO_INCREMENT|BACKUP|BDB|BEGIN|BERKELEYDB|BIGINT|BINARY|BIT|BLOB|BOOL|BOOLEAN|BREAK|BROWSE|BTREE|BULK|BY|CALL|CASCADED?|CASE|CHAIN|CHAR(?:ACTER|SET)?|CHECK(?:POINT)?|CLOSE|CLUSTERED|COALESCE|COLLATE|COLUMNS?|COMMENT|COMMIT(?:TED)?|COMPUTE|CONNECT|CONSISTENT|CONSTRAINT|CONTAINS(?:TABLE)?|CONTINUE|CONVERT|CREATE|CROSS|CURRENT(?:_DATE|_TIME|_TIMESTAMP|_USER)?|CURSOR|CYCLE|DATA(?:BASES?)?|DATE(?:TIME)?|DAY|DBCC|DEALLOCATE|DEC|DECIMAL|DECLARE|DEFAULT|DEFINER|DELAYED|DELETE|DELIMITERS?|DENY|DESC|DESCRIBE|DETERMINISTIC|DISABLE|DISCARD|DISK|DISTINCT|DISTINCTROW|DISTRIBUTED|DO|DOUBLE|DROP|DUMMY|DUMP(?:FILE)?|DUPLICATE|ELSE(?:IF)?|ENABLE|ENCLOSED|END|ENGINE|ENUM|ERRLVL|ERRORS|ESCAPED?|EXCEPT|EXEC(?:UTE)?|EXISTS|EXIT|EXPLAIN|EXTENDED|FETCH|FIELDS|FILE|FILLFACTOR|FIRST|FIXED|FLOAT|FOLLOWING|FOR(?: EACH ROW)?|FORCE|FOREIGN|FREETEXT(?:TABLE)?|FROM|FULL|FUNCTION|GEOMETRY(?:COLLECTION)?|GLOBAL|GOTO|GRANT|GROUP|HANDLER|HASH|HAVING|HOLDLOCK|HOUR|IDENTITY(?:COL|_INSERT)?|IF|IGNORE|IMPORT|INDEX|INFILE|INNER|INNODB|INOUT|INSERT|INT|INTEGER|INTERSECT|INTERVAL|INTO|INVOKER|ISOLATION|ITERATE|JOIN|KEYS?|KILL|LANGUAGE|LAST|LEAVE|LEFT|LEVEL|LIMIT|LINENO|LINES|LINESTRING|LOAD|LOCAL|LOCK|LONG(?:BLOB|TEXT)|LOOP|MATCH(?:ED)?|MEDIUM(?:BLOB|INT|TEXT)|MERGE|MIDDLEINT|MINUTE|MODE|MODIFIES|MODIFY|MONTH|MULTI(?:LINESTRING|POINT|POLYGON)|NATIONAL|NATURAL|NCHAR|NEXT|NO|NONCLUSTERED|NULLIF|NUMERIC|OFF?|OFFSETS?|ON|OPEN(?:DATASOURCE|QUERY|ROWSET)?|OPTIMIZE|OPTION(?:ALLY)?|ORDER|OUT(?:ER|FILE)?|OVER|PARTIAL|PARTITION|PERCENT|PIVOT|PLAN|POINT|POLYGON|PRECEDING|PRECISION|PREPARE|PREV|PRIMARY|PRINT|PRIVILEGES|PROC(?:EDURE)?|PUBLIC|PURGE|QUICK|RAISERROR|READS?|REAL|RECONFIGURE|REFERENCES|RELEASE|RENAME|REPEAT(?:ABLE)?|REPLACE|REPLICATION|REQUIRE|RESIGNAL|RESTORE|RESTRICT|RETURN(?:ING|S)?|REVOKE|RIGHT|ROLLBACK|ROUTINE|ROW(?:COUNT|GUIDCOL|S)?|RTREE|RULE|SAVE(?:POINT)?|SCHEMA|SECOND|SELECT|SERIAL(?:IZABLE)?|SESSION(?:_USER)?|SET(?:USER)?|SHARE|SHOW|SHUTDOWN|SIMPLE|SMALLINT|SNAPSHOT|SOME|SONAME|SQL|START(?:ING)?|STATISTICS|STATUS|STRIPED|SYSTEM_USER|TABLES?|TABLESPACE|TEMP(?:ORARY|TABLE)?|TERMINATED|TEXT(?:SIZE)?|THEN|TIME(?:STAMP)?|TINY(?:BLOB|INT|TEXT)|TOP?|TRAN(?:SACTIONS?)?|TRIGGER|TRUNCATE|TSEQUAL|TYPES?|UNBOUNDED|UNCOMMITTED|UNDEFINED|UNION|UNIQUE|UNLOCK|UNPIVOT|UNSIGNED|UPDATE(?:TEXT)?|USAGE|USE|USER|USING|VALUES?|VAR(?:BINARY|CHAR|CHARACTER|YING)|VIEW|WAITFOR|WARNINGS|WHEN|WHERE|WHILE|WITH(?: ROLLUP|IN)?|WORK|WRITE(?:TEXT)?|YEAR)\b/i,
	'boolean': /\b(?:FALSE|NULL|TRUE)\b/i,
	'number': /\b0x[\da-f]+\b|\b\d+(?:\.\d*)?|\B\.\d+\b/i,
	'operator': /[-+*\/=%^~]|&&?|\|\|?|!=?|<(?:=>?|<|>)?|>[>=]?|\b(?:AND|BETWEEN|DIV|ILIKE|IN|IS|LIKE|NOT|OR|REGEXP|RLIKE|SOUNDS LIKE|XOR)\b/i,
	'punctuation': /[;[\]()`,.]/
};

Prism.languages.tcl = {
	'comment': {
		pattern: /(^|[^\\])#.*/,
		lookbehind: true
	},
	'string': {
		pattern: /"(?:[^"\\\r\n]|\\(?:\r\n|[\s\S]))*"/,
		greedy: true
	},
	'variable': [
		{
			pattern: /(\$)(?:::)?(?:[a-zA-Z0-9]+::)*\w+/,
			lookbehind: true
		},
		{
			pattern: /(\$)\{[^}]+\}/,
			lookbehind: true
		},
		{
			pattern: /(^[\t ]*set[ \t]+)(?:::)?(?:[a-zA-Z0-9]+::)*\w+/m,
			lookbehind: true
		}
	],
	'function': {
		pattern: /(^[\t ]*proc[ \t]+)\S+/m,
		lookbehind: true
	},
	'builtin': [
		{
			pattern: /(^[\t ]*)(?:break|class|continue|error|eval|exit|for|foreach|if|proc|return|switch|while)\b/m,
			lookbehind: true
		},
		/\b(?:else|elseif)\b/
	],
	'scope': {
		pattern: /(^[\t ]*)(?:global|upvar|variable)\b/m,
		lookbehind: true,
		alias: 'constant'
	},
	'keyword': {
		pattern: /(^[\t ]*|\[)(?:Safe_Base|Tcl|after|append|apply|array|auto_(?:execok|import|load|mkindex|qualify|reset)|automkindex_old|bgerror|binary|catch|cd|chan|clock|close|concat|dde|dict|encoding|eof|exec|expr|fblocked|fconfigure|fcopy|file(?:event|name)?|flush|gets|glob|history|http|incr|info|interp|join|lappend|lassign|lindex|linsert|list|llength|load|lrange|lrepeat|lreplace|lreverse|lsearch|lset|lsort|math(?:func|op)|memory|msgcat|namespace|open|package|parray|pid|pkg_mkIndex|platform|puts|pwd|re_syntax|read|refchan|regexp|registry|regsub|rename|scan|seek|set|socket|source|split|string|subst|tcl(?:_endOfWord|_findLibrary|startOf(?:Next|Previous)Word|test|vars|wordBreak(?:After|Before))|tell|time|tm|trace|unknown|unload|unset|update|uplevel|vwait)\b/m,
		lookbehind: true
	},
	'operator': /!=?|\*\*?|==|&&?|\|\|?|<[=<]?|>[=>]?|[-+~\/%?^]|\b(?:eq|in|ne|ni)\b/,
	'punctuation': /[{}()\[\]]/
};

(function (Prism) {

	Prism.languages.typescript = Prism.languages.extend('javascript', {
		'class-name': {
			pattern: /(\b(?:class|extends|implements|instanceof|interface|new|type)\s+)(?!keyof\b)(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*(?:\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>)?/,
			lookbehind: true,
			greedy: true,
			inside: null // see below
		},
		'builtin': /\b(?:Array|Function|Promise|any|boolean|console|never|number|string|symbol|unknown)\b/,
	});

	// The keywords TypeScript adds to JavaScript
	Prism.languages.typescript.keyword.push(
		/\b(?:abstract|declare|is|keyof|readonly|require)\b/,
		// keywords that have to be followed by an identifier
		/\b(?:asserts|infer|interface|module|namespace|type)\b(?=\s*(?:[{_$a-zA-Z\xA0-\uFFFF]|$))/,
		// This is for `import type *, {}`
		/\btype\b(?=\s*(?:[\{*]|$))/
	);

	// doesn't work with TS because TS is too complex
	delete Prism.languages.typescript['parameter'];
	delete Prism.languages.typescript['literal-property'];

	// a version of typescript specifically for highlighting types
	var typeInside = Prism.languages.extend('typescript', {});
	delete typeInside['class-name'];

	Prism.languages.typescript['class-name'].inside = typeInside;

	Prism.languages.insertBefore('typescript', 'function', {
		'decorator': {
			pattern: /@[$\w\xA0-\uFFFF]+/,
			inside: {
				'at': {
					pattern: /^@/,
					alias: 'operator'
				},
				'function': /^[\s\S]+/
			}
		},
		'generic-function': {
			// e.g. foo<T extends "bar" | "baz">( ...
			pattern: /#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*\s*<(?:[^<>]|<(?:[^<>]|<[^<>]*>)*>)*>(?=\s*\()/,
			greedy: true,
			inside: {
				'function': /^#?(?!\s)[_$a-zA-Z\xA0-\uFFFF](?:(?!\s)[$\w\xA0-\uFFFF])*/,
				'generic': {
					pattern: /<[\s\S]+/, // everything after the first <
					alias: 'class-name',
					inside: typeInside
				}
			}
		}
	});

	Prism.languages.ts = Prism.languages.typescript;

}(Prism));

(function (Prism) {

	// https://yaml.org/spec/1.2/spec.html#c-ns-anchor-property
	// https://yaml.org/spec/1.2/spec.html#c-ns-alias-node
	var anchorOrAlias = /[*&][^\s[\]{},]+/;
	// https://yaml.org/spec/1.2/spec.html#c-ns-tag-property
	var tag = /!(?:<[\w\-%#;/?:@&=+$,.!~*'()[\]]+>|(?:[a-zA-Z\d-]*!)?[\w\-%#;/?:@&=+$.~*'()]+)?/;
	// https://yaml.org/spec/1.2/spec.html#c-ns-properties(n,c)
	var properties = '(?:' + tag.source + '(?:[ \t]+' + anchorOrAlias.source + ')?|'
		+ anchorOrAlias.source + '(?:[ \t]+' + tag.source + ')?)';
	// https://yaml.org/spec/1.2/spec.html#ns-plain(n,c)
	// This is a simplified version that doesn't support "#" and multiline keys
	// All these long scarry character classes are simplified versions of YAML's characters
	var plainKey = /(?:[^\s\x00-\x08\x0e-\x1f!"#%&'*,\-:>?@[\]`{|}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]|[?:-]<PLAIN>)(?:[ \t]*(?:(?![#:])<PLAIN>|:<PLAIN>))*/.source
		.replace(/<PLAIN>/g, function () { return /[^\s\x00-\x08\x0e-\x1f,[\]{}\x7f-\x84\x86-\x9f\ud800-\udfff\ufffe\uffff]/.source; });
	var string = /"(?:[^"\\\r\n]|\\.)*"|'(?:[^'\\\r\n]|\\.)*'/.source;

	/**
	 *
	 * @param {string} value
	 * @param {string} [flags]
	 * @returns {RegExp}
	 */
	function createValuePattern(value, flags) {
		flags = (flags || '').replace(/m/g, '') + 'm'; // add m flag
		var pattern = /([:\-,[{]\s*(?:\s<<prop>>[ \t]+)?)(?:<<value>>)(?=[ \t]*(?:$|,|\]|\}|(?:[\r\n]\s*)?#))/.source
			.replace(/<<prop>>/g, function () { return properties; }).replace(/<<value>>/g, function () { return value; });
		return RegExp(pattern, flags);
	}

	Prism.languages.yaml = {
		'scalar': {
			pattern: RegExp(/([\-:]\s*(?:\s<<prop>>[ \t]+)?[|>])[ \t]*(?:((?:\r?\n|\r)[ \t]+)\S[^\r\n]*(?:\2[^\r\n]+)*)/.source
				.replace(/<<prop>>/g, function () { return properties; })),
			lookbehind: true,
			alias: 'string'
		},
		'comment': /#.*/,
		'key': {
			pattern: RegExp(/((?:^|[:\-,[{\r\n?])[ \t]*(?:<<prop>>[ \t]+)?)<<key>>(?=\s*:\s)/.source
				.replace(/<<prop>>/g, function () { return properties; })
				.replace(/<<key>>/g, function () { return '(?:' + plainKey + '|' + string + ')'; })),
			lookbehind: true,
			greedy: true,
			alias: 'atrule'
		},
		'directive': {
			pattern: /(^[ \t]*)%.+/m,
			lookbehind: true,
			alias: 'important'
		},
		'datetime': {
			pattern: createValuePattern(/\d{4}-\d\d?-\d\d?(?:[tT]|[ \t]+)\d\d?:\d{2}:\d{2}(?:\.\d*)?(?:[ \t]*(?:Z|[-+]\d\d?(?::\d{2})?))?|\d{4}-\d{2}-\d{2}|\d\d?:\d{2}(?::\d{2}(?:\.\d*)?)?/.source),
			lookbehind: true,
			alias: 'number'
		},
		'boolean': {
			pattern: createValuePattern(/false|true/.source, 'i'),
			lookbehind: true,
			alias: 'important'
		},
		'null': {
			pattern: createValuePattern(/null|~/.source, 'i'),
			lookbehind: true,
			alias: 'important'
		},
		'string': {
			pattern: createValuePattern(string),
			lookbehind: true,
			greedy: true
		},
		'number': {
			pattern: createValuePattern(/[+-]?(?:0x[\da-f]+|0o[0-7]+|(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|\.inf|\.nan)/.source, 'i'),
			lookbehind: true
		},
		'tag': tag,
		'important': anchorOrAlias,
		'punctuation': /---|[:[\]{}\-,|>?]|\.\.\./
	};

	Prism.languages.yml = Prism.languages.yaml;

}(Prism));

(function (Prism) {

	function literal(str) {
		return function () { return str; };
	}

	var keyword = /\b(?:align|allowzero|and|anyframe|anytype|asm|async|await|break|cancel|catch|comptime|const|continue|defer|else|enum|errdefer|error|export|extern|fn|for|if|inline|linksection|nakedcc|noalias|nosuspend|null|or|orelse|packed|promise|pub|resume|return|stdcallcc|struct|suspend|switch|test|threadlocal|try|undefined|union|unreachable|usingnamespace|var|volatile|while)\b/;

	var IDENTIFIER = '\\b(?!' + keyword.source + ')(?!\\d)\\w+\\b';
	var ALIGN = /align\s*\((?:[^()]|\([^()]*\))*\)/.source;
	var PREFIX_TYPE_OP = /(?:\?|\bpromise->|(?:\[[^[\]]*\]|\*(?!\*)|\*\*)(?:\s*<ALIGN>|\s*const\b|\s*volatile\b|\s*allowzero\b)*)/.source.replace(/<ALIGN>/g, literal(ALIGN));
	var SUFFIX_EXPR = /(?:\bpromise\b|(?:\berror\.)?<ID>(?:\.<ID>)*(?!\s+<ID>))/.source.replace(/<ID>/g, literal(IDENTIFIER));
	var TYPE = '(?!\\s)(?:!?\\s*(?:' + PREFIX_TYPE_OP + '\\s*)*' + SUFFIX_EXPR + ')+';

	/*
	 * A simplified grammar for Zig compile time type literals:
	 *
	 * TypeExpr = ( "!"? PREFIX_TYPE_OP* SUFFIX_EXPR )+
	 *
	 * SUFFIX_EXPR = ( \b "promise" \b | ( \b "error" "." )? IDENTIFIER ( "." IDENTIFIER )* (?! \s+ IDENTIFIER ) )
	 *
	 * PREFIX_TYPE_OP = "?"
	 *                | \b "promise" "->"
	 *                | ( "[" [^\[\]]* "]" | "*" | "**" ) ( ALIGN | "const" \b | "volatile" \b | "allowzero" \b )*
	 *
	 * ALIGN = "align" "(" ( [^()] | "(" [^()]* ")" )* ")"
	 *
	 * IDENTIFIER = \b (?! KEYWORD ) [a-zA-Z_] \w* \b
	 *
	*/

	Prism.languages.zig = {
		'comment': [
			{
				pattern: /\/\/[/!].*/,
				alias: 'doc-comment'
			},
			/\/{2}.*/
		],
		'string': [
			{
				// "string" and c"string"
				pattern: /(^|[^\\@])c?"(?:[^"\\\r\n]|\\.)*"/,
				lookbehind: true,
				greedy: true
			},
			{
				// multiline strings and c-strings
				pattern: /([\r\n])([ \t]+c?\\{2}).*(?:(?:\r\n?|\n)\2.*)*/,
				lookbehind: true,
				greedy: true
			}
		],
		'char': {
			// characters 'a', '\n', '\xFF', '\u{10FFFF}'
			pattern: /(^|[^\\])'(?:[^'\\\r\n]|[\uD800-\uDFFF]{2}|\\(?:.|x[a-fA-F\d]{2}|u\{[a-fA-F\d]{1,6}\}))'/,
			lookbehind: true,
			greedy: true
		},
		'builtin': /\B@(?!\d)\w+(?=\s*\()/,
		'label': {
			pattern: /(\b(?:break|continue)\s*:\s*)\w+\b|\b(?!\d)\w+\b(?=\s*:\s*(?:\{|while\b))/,
			lookbehind: true
		},
		'class-name': [
			// const Foo = struct {};
			/\b(?!\d)\w+(?=\s*=\s*(?:(?:extern|packed)\s+)?(?:enum|struct|union)\s*[({])/,
			{
				// const x: i32 = 9;
				// var x: Bar;
				// fn foo(x: bool, y: f32) void {}
				pattern: RegExp(/(:\s*)<TYPE>(?=\s*(?:<ALIGN>\s*)?[=;,)])|<TYPE>(?=\s*(?:<ALIGN>\s*)?\{)/.source.replace(/<TYPE>/g, literal(TYPE)).replace(/<ALIGN>/g, literal(ALIGN))),
				lookbehind: true,
				inside: null // see below
			},
			{
				// extern fn foo(x: f64) f64; (optional alignment)
				pattern: RegExp(/(\)\s*)<TYPE>(?=\s*(?:<ALIGN>\s*)?;)/.source.replace(/<TYPE>/g, literal(TYPE)).replace(/<ALIGN>/g, literal(ALIGN))),
				lookbehind: true,
				inside: null // see below
			}
		],
		'builtin-type': {
			pattern: /\b(?:anyerror|bool|c_u?(?:int|long|longlong|short)|c_longdouble|c_void|comptime_(?:float|int)|f(?:16|32|64|128)|[iu](?:8|16|32|64|128|size)|noreturn|type|void)\b/,
			alias: 'keyword'
		},
		'keyword': keyword,
		'function': /\b(?!\d)\w+(?=\s*\()/,
		'number': /\b(?:0b[01]+|0o[0-7]+|0x[a-fA-F\d]+(?:\.[a-fA-F\d]*)?(?:[pP][+-]?[a-fA-F\d]+)?|\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)\b/,
		'boolean': /\b(?:false|true)\b/,
		'operator': /\.[*?]|\.{2,3}|[-=]>|\*\*|\+\+|\|\||(?:<<|>>|[-+*]%|[-+*/%^&|<>!=])=?|[?~]/,
		'punctuation': /[.:,;(){}[\]]/
	};

	Prism.languages.zig['class-name'].forEach(function (obj) {
		if (obj.inside === null) {
			obj.inside = Prism.languages.zig;
		}
	});

}(Prism));

/*
 * Cookies.js - 1.2.3 (patched for SameSite=Strict and secure=true)
 * https://github.com/ScottHamper/Cookies
 *
 * This is free and unencumbered software released into the public domain.
 */
(function (global, undefined) {
  "use strict";

  var factory = function (window) {
    if (typeof window.document !== "object") {
      throw new Error(
        "Cookies.js requires a `window` with a `document` object",
      );
    }

    var Cookies = function (key, value, options) {
      return arguments.length === 1
        ? Cookies.get(key)
        : Cookies.set(key, value, options);
    };

    // Allows for setter injection in unit tests
    Cookies._document = window.document;

    // Used to ensure cookie keys do not collide with
    // built-in `Object` properties
    Cookies._cacheKeyPrefix = "cookey."; // Hurr hurr, :)

    Cookies._maxExpireDate = new Date("Fri, 31 Dec 9999 23:59:59 UTC");

    Cookies.defaults = {
      path: "/",
      SameSite: "Strict",
      secure: true,
    };

    Cookies.get = function (key) {
      if (Cookies._cachedDocumentCookie !== Cookies._document.cookie) {
        Cookies._renewCache();
      }

      var value = Cookies._cache[Cookies._cacheKeyPrefix + key];

      return value === undefined ? undefined : decodeURIComponent(value);
    };

    Cookies.set = function (key, value, options) {
      options = Cookies._getExtendedOptions(options);
      options.expires = Cookies._getExpiresDate(
        value === undefined ? -1 : options.expires,
      );

      Cookies._document.cookie = Cookies._generateCookieString(
        key,
        value,
        options,
      );

      return Cookies;
    };

    Cookies.expire = function (key, options) {
      return Cookies.set(key, undefined, options);
    };

    Cookies._getExtendedOptions = function (options) {
      return {
        path: (options && options.path) || Cookies.defaults.path,
        domain: (options && options.domain) || Cookies.defaults.domain,
        SameSite: (options && options.SameSite) || Cookies.defaults.SameSite,
        expires: (options && options.expires) || Cookies.defaults.expires,
        secure:
          options && options.secure !== undefined
            ? options.secure
            : Cookies.defaults.secure,
      };
    };

    Cookies._isValidDate = function (date) {
      return (
        Object.prototype.toString.call(date) === "[object Date]" &&
        !isNaN(date.getTime())
      );
    };

    Cookies._getExpiresDate = function (expires, now) {
      now = now || new Date();

      if (typeof expires === "number") {
        expires =
          expires === Infinity
            ? Cookies._maxExpireDate
            : new Date(now.getTime() + expires * 1000);
      } else if (typeof expires === "string") {
        expires = new Date(expires);
      }

      if (expires && !Cookies._isValidDate(expires)) {
        throw new Error(
          "`expires` parameter cannot be converted to a valid Date instance",
        );
      }

      return expires;
    };

    Cookies._generateCookieString = function (key, value, options) {
      key = key.replace(/[^#$&+\^`|]/g, encodeURIComponent);
      key = key.replace(/\(/g, "%28").replace(/\)/g, "%29");
      value = (value + "").replace(
        /[^!#$&-+\--:<-\[\]-~]/g,
        encodeURIComponent,
      );
      options = options || {};

      var cookieString = key + "=" + value;
      cookieString += options.path ? ";path=" + options.path : "";
      cookieString += options.domain ? ";domain=" + options.domain : "";
      cookieString += options.SameSite ? ";SameSite=" + options.SameSite : "";
      cookieString += options.expires
        ? ";expires=" + options.expires.toUTCString()
        : "";
      cookieString += options.secure ? ";secure" : "";

      return cookieString;
    };

    Cookies._getCacheFromString = function (documentCookie) {
      var cookieCache = {};
      var cookiesArray = documentCookie ? documentCookie.split("; ") : [];

      for (var i = 0; i < cookiesArray.length; i++) {
        var cookieKvp = Cookies._getKeyValuePairFromCookieString(
          cookiesArray[i],
        );

        if (
          cookieCache[Cookies._cacheKeyPrefix + cookieKvp.key] === undefined
        ) {
          cookieCache[Cookies._cacheKeyPrefix + cookieKvp.key] =
            cookieKvp.value;
        }
      }

      return cookieCache;
    };

    Cookies._getKeyValuePairFromCookieString = function (cookieString) {
      // "=" is a valid character in a cookie value according to RFC6265, so cannot `split('=')`
      var separatorIndex = cookieString.indexOf("=");

      // IE omits the "=" when the cookie value is an empty string
      separatorIndex =
        separatorIndex < 0 ? cookieString.length : separatorIndex;

      var key = cookieString.substr(0, separatorIndex);
      var decodedKey;
      try {
        decodedKey = decodeURIComponent(key);
      } catch (e) {
        if (console && typeof console.error === "function") {
          console.error('Could not decode cookie with key "' + key + '"', e);
        }
      }

      return {
        key: decodedKey,
        value: cookieString.substr(separatorIndex + 1), // Defer decoding value until accessed
      };
    };

    Cookies._renewCache = function () {
      Cookies._cache = Cookies._getCacheFromString(Cookies._document.cookie);
      Cookies._cachedDocumentCookie = Cookies._document.cookie;
    };

    Cookies._areEnabled = function () {
      var testKey = "cookies.js";
      var areEnabled = Cookies.set(testKey, 1).get(testKey) === "1";
      Cookies.expire(testKey);
      return areEnabled;
    };

    Cookies.enabled = Cookies._areEnabled();

    return Cookies;
  };
  var cookiesExport =
    global && typeof global.document === "object" ? factory(global) : factory;

  // AMD support
  if (typeof define === "function" && define.amd) {
    define(function () {
      return cookiesExport;
    });
    // CommonJS/Node.js support
  } else if (typeof exports === "object") {
    // Support Node.js specific `module.exports` (which can be a function)
    if (typeof module === "object" && typeof module.exports === "object") {
      exports = module.exports = cookiesExport;
    }
    // But always support CommonJS module 1.1.1 spec (`exports` cannot be a function)
    exports.Cookies = cookiesExport;
  } else {
    global.Cookies = cookiesExport;
  }
})(typeof window === "undefined" ? this : window);
/*
 * classList.js: Cross-browser full element.classList implementation.
 * 1.1.20170427
 *
 * By Eli Grey, http://eligrey.com
 * License: Dedicated to the public domain.
 *   See https://github.com/eligrey/classList.js/blob/master/LICENSE.md
 */

/*global self, document, DOMException */

/*! @source http://purl.eligrey.com/github/classList.js/blob/master/classList.js */

if ("document" in self) {
  // Full polyfill for browsers with no classList support
  // Including IE < Edge missing SVGElement.classList
  if (
    !("classList" in document.createElement("_")) ||
    (document.createElementNS &&
      !(
        "classList" in
        document.createElementNS("http://www.w3.org/2000/svg", "g")
      ))
  ) {
    (function (view) {
      "use strict";

      if (!("Element" in view)) return;

      var classListProp = "classList",
        protoProp = "prototype",
        elemCtrProto = view.Element[protoProp],
        objCtr = Object,
        strTrim =
          String[protoProp].trim ||
          function () {
            return this.replace(/^\s+|\s+$/g, "");
          },
        arrIndexOf =
          Array[protoProp].indexOf ||
          function (item) {
            var i = 0,
              len = this.length;
            for (; i < len; i++) {
              if (i in this && this[i] === item) {
                return i;
              }
            }
            return -1;
          },
        // Vendors: please allow content code to instantiate DOMExceptions
        DOMEx = function (type, message) {
          this.name = type;
          this.code = DOMException[type];
          this.message = message;
        },
        checkTokenAndGetIndex = function (classList, token) {
          if (token === "") {
            throw new DOMEx(
              "SYNTAX_ERR",
              "An invalid or illegal string was specified",
            );
          }
          if (/\s/.test(token)) {
            throw new DOMEx(
              "INVALID_CHARACTER_ERR",
              "String contains an invalid character",
            );
          }
          return arrIndexOf.call(classList, token);
        },
        ClassList = function (elem) {
          var trimmedClasses = strTrim.call(elem.getAttribute("class") || ""),
            classes = trimmedClasses ? trimmedClasses.split(/\s+/) : [],
            i = 0,
            len = classes.length;
          for (; i < len; i++) {
            this.push(classes[i]);
          }
          this._updateClassName = function () {
            elem.setAttribute("class", this.toString());
          };
        },
        classListProto = (ClassList[protoProp] = []),
        classListGetter = function () {
          return new ClassList(this);
        };
      // Most DOMException implementations don't allow calling DOMException's toString()
      // on non-DOMExceptions. Error's toString() is sufficient here.
      DOMEx[protoProp] = Error[protoProp];
      classListProto.item = function (i) {
        return this[i] || null;
      };
      classListProto.contains = function (token) {
        token += "";
        return checkTokenAndGetIndex(this, token) !== -1;
      };
      classListProto.add = function () {
        var tokens = arguments,
          i = 0,
          l = tokens.length,
          token,
          updated = false;
        do {
          token = tokens[i] + "";
          if (checkTokenAndGetIndex(this, token) === -1) {
            this.push(token);
            updated = true;
          }
        } while (++i < l);

        if (updated) {
          this._updateClassName();
        }
      };
      classListProto.remove = function () {
        var tokens = arguments,
          i = 0,
          l = tokens.length,
          token,
          updated = false,
          index;
        do {
          token = tokens[i] + "";
          index = checkTokenAndGetIndex(this, token);
          while (index !== -1) {
            this.splice(index, 1);
            updated = true;
            index = checkTokenAndGetIndex(this, token);
          }
        } while (++i < l);

        if (updated) {
          this._updateClassName();
        }
      };
      classListProto.toggle = function (token, force) {
        token += "";

        var result = this.contains(token),
          method = result
            ? force !== true && "remove"
            : force !== false && "add";
        if (method) {
          this[method](token);
        }

        if (force === true || force === false) {
          return force;
        } else {
          return !result;
        }
      };
      classListProto.toString = function () {
        return this.join(" ");
      };

      if (objCtr.defineProperty) {
        var classListPropDesc = {
          get: classListGetter,
          enumerable: true,
          configurable: true,
        };
        try {
          objCtr.defineProperty(elemCtrProto, classListProp, classListPropDesc);
        } catch (ex) {
          // IE 8 doesn't support enumerable:true
          // adding undefined to fight this issue https://github.com/eligrey/classList.js/issues/36
          // modernie IE8-MSW7 machine has IE8 8.0.6001.18702 and is affected
          if (ex.number === undefined || ex.number === -0x7ff5ec54) {
            classListPropDesc.enumerable = false;
            objCtr.defineProperty(
              elemCtrProto,
              classListProp,
              classListPropDesc,
            );
          }
        }
      } else if (objCtr[protoProp].__defineGetter__) {
        elemCtrProto.__defineGetter__(classListProp, classListGetter);
      }
    })(self);
  }

  // There is full or partial native classList support, so just check if we need
  // to normalize the add/remove and toggle APIs.

  (function () {
    "use strict";

    var testElement = document.createElement("_");

    testElement.classList.add("c1", "c2");

    // Polyfill for IE 10/11 and Firefox <26, where classList.add and
    // classList.remove exist but support only one argument at a time.
    if (!testElement.classList.contains("c2")) {
      var createMethod = function (method) {
        var original = DOMTokenList.prototype[method];

        DOMTokenList.prototype[method] = function (token) {
          var i,
            len = arguments.length;

          for (i = 0; i < len; i++) {
            token = arguments[i];
            original.call(this, token);
          }
        };
      };
      createMethod("add");
      createMethod("remove");
    }

    testElement.classList.toggle("c3", false);

    // Polyfill for IE 10 and Firefox <24, where classList.toggle does not
    // support the second argument.
    if (testElement.classList.contains("c3")) {
      var _toggle = DOMTokenList.prototype.toggle;

      DOMTokenList.prototype.toggle = function (token, force) {
        if (1 in arguments && !this.contains(token) === !force) {
          return force;
        } else {
          return _toggle.call(this, token);
        }
      };
    }

    testElement = null;
  })();
};
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * Adapted from: https://github.com/fred-wang/mathml.css */

(function () {
  window.addEventListener("load", function () {
    var box, div, link, namespaceURI;
    // First check whether the page contains any <math> element.
    namespaceURI = "http://www.w3.org/1998/Math/MathML";
    // Create a div to test mspace, using Kuma's "offscreen" CSS
    document.body.insertAdjacentHTML(
      "afterbegin",
      "<div style='border: 0; clip: rect(0 0 0 0); height: 1px; margin: -1px; overflow: hidden; padding: 0; position: absolute; width: 1px;'><math xmlns='" +
        namespaceURI +
        "'><mspace height='23px' width='77px'></mspace></math></div>",
    );
    div = document.body.firstChild;
    box = div.firstChild.firstChild.getBoundingClientRect();
    document.body.removeChild(div);
    if (Math.abs(box.height - 23) > 1 || Math.abs(box.width - 77) > 1) {
      window.supportsMathML = false;
    }
  });
})();
//
// Traversing
//

let smoothDistance, smoothDuration, smoothEnd, smoothStart;
this.$ = function (selector, el) {
  if (el == null) {
    el = document;
  }
  try {
    return el.querySelector(selector);
  } catch (error) {}
};

this.$$ = function (selector, el) {
  if (el == null) {
    el = document;
  }
  try {
    return el.querySelectorAll(selector);
  } catch (error) {}
};

$.id = (id) => document.getElementById(id);

$.hasChild = function (parent, el) {
  if (!parent) {
    return;
  }
  while (el) {
    if (el === parent) {
      return true;
    }
    if (el === document.body) {
      return;
    }
    el = el.parentNode;
  }
};

$.closestLink = function (el, parent) {
  if (parent == null) {
    parent = document.body;
  }
  while (el) {
    if (el.tagName === "A") {
      return el;
    }
    if (el === parent) {
      return;
    }
    el = el.parentNode;
  }
};

//
// Events
//

$.on = function (el, event, callback, useCapture) {
  if (useCapture == null) {
    useCapture = false;
  }
  if (event.includes(" ")) {
    for (var name of event.split(" ")) {
      $.on(el, name, callback);
    }
  } else {
    el.addEventListener(event, callback, useCapture);
  }
};

$.off = function (el, event, callback, useCapture) {
  if (useCapture == null) {
    useCapture = false;
  }
  if (event.includes(" ")) {
    for (var name of event.split(" ")) {
      $.off(el, name, callback);
    }
  } else {
    el.removeEventListener(event, callback, useCapture);
  }
};

$.trigger = function (el, type, canBubble, cancelable) {
  const event = new Event(type, {
    bubbles: canBubble ?? true,
    cancelable: cancelable ?? true,
  });
  el.dispatchEvent(event);
};

$.click = function (el) {
  const event = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
  });
  el.dispatchEvent(event);
};

$.stopEvent = function (event) {
  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
};

$.eventTarget = (event) => event.target.correspondingUseElement || event.target;

//
// Manipulation
//

const buildFragment = function (value) {
  const fragment = document.createDocumentFragment();

  if ($.isCollection(value)) {
    for (var child of $.makeArray(value)) {
      fragment.appendChild(child);
    }
  } else {
    fragment.innerHTML = value;
  }

  return fragment;
};

$.append = function (el, value) {
  if (typeof value === "string") {
    el.insertAdjacentHTML("beforeend", value);
  } else {
    if ($.isCollection(value)) {
      value = buildFragment(value);
    }
    el.appendChild(value);
  }
};

$.prepend = function (el, value) {
  if (!el.firstChild) {
    $.append(value);
  } else if (typeof value === "string") {
    el.insertAdjacentHTML("afterbegin", value);
  } else {
    if ($.isCollection(value)) {
      value = buildFragment(value);
    }
    el.insertBefore(value, el.firstChild);
  }
};

$.before = function (el, value) {
  if (typeof value === "string" || $.isCollection(value)) {
    value = buildFragment(value);
  }

  el.parentNode.insertBefore(value, el);
};

$.after = function (el, value) {
  if (typeof value === "string" || $.isCollection(value)) {
    value = buildFragment(value);
  }

  if (el.nextSibling) {
    el.parentNode.insertBefore(value, el.nextSibling);
  } else {
    el.parentNode.appendChild(value);
  }
};

$.remove = function (value) {
  if ($.isCollection(value)) {
    for (var el of $.makeArray(value)) {
      if (el.parentNode != null) {
        el.parentNode.removeChild(el);
      }
    }
  } else {
    if (value.parentNode != null) {
      value.parentNode.removeChild(value);
    }
  }
};

$.empty = function (el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
};

// Calls the function while the element is off the DOM to avoid triggering
// unnecessary reflows and repaints.
$.batchUpdate = function (el, fn) {
  const parent = el.parentNode;
  const sibling = el.nextSibling;
  parent.removeChild(el);

  fn(el);

  if (sibling) {
    parent.insertBefore(el, sibling);
  } else {
    parent.appendChild(el);
  }
};

//
// Offset
//

$.rect = (el) => el.getBoundingClientRect();

$.offset = function (el, container) {
  if (container == null) {
    container = document.body;
  }
  let top = 0;
  let left = 0;

  while (el && el !== container) {
    top += el.offsetTop;
    left += el.offsetLeft;
    el = el.offsetParent;
  }

  return {
    top,
    left,
  };
};

$.scrollParent = function (el) {
  while ((el = el.parentNode) && el.nodeType === 1) {
    var needle;
    if (el.scrollTop > 0) {
      break;
    }
    if (
      ((needle = getComputedStyle(el)?.overflowY),
      ["auto", "scroll"].includes(needle))
    ) {
      break;
    }
  }
  return el;
};

$.scrollTo = function (el, parent, position, options) {
  if (position == null) {
    position = "center";
  }
  if (options == null) {
    options = {};
  }
  if (!el) {
    return;
  }

  if (parent == null) {
    parent = $.scrollParent(el);
  }
  if (!parent) {
    return;
  }

  const parentHeight = parent.clientHeight;
  const parentScrollHeight = parent.scrollHeight;
  if (!(parentScrollHeight > parentHeight)) {
    return;
  }

  const { top } = $.offset(el, parent);
  const { offsetTop } = parent.firstElementChild;

  switch (position) {
    case "top":
      parent.scrollTop = top - offsetTop - (options.margin || 0);
      break;
    case "center":
      parent.scrollTop =
        top - Math.round(parentHeight / 2 - el.offsetHeight / 2);
      break;
    case "continuous":
      var { scrollTop } = parent;
      var height = el.offsetHeight;

      var lastElementOffset =
        parent.lastElementChild.offsetTop +
        parent.lastElementChild.offsetHeight;
      var offsetBottom =
        lastElementOffset > 0 ? parentScrollHeight - lastElementOffset : 0;

      // If the target element is above the visible portion of its scrollable
      // ancestor, move it near the top with a gap = options.topGap * target's height.
      if (top - offsetTop <= scrollTop + height * (options.topGap || 1)) {
        parent.scrollTop = top - offsetTop - height * (options.topGap || 1);
        // If the target element is below the visible portion of its scrollable
        // ancestor, move it near the bottom with a gap = options.bottomGap * target's height.
      } else if (
        top + offsetBottom >=
        scrollTop + parentHeight - height * ((options.bottomGap || 1) + 1)
      ) {
        parent.scrollTop =
          top +
          offsetBottom -
          parentHeight +
          height * ((options.bottomGap || 1) + 1);
      }
      break;
  }
};

$.scrollToWithImageLock = function (el, parent, ...args) {
  if (parent == null) {
    parent = $.scrollParent(el);
  }
  if (!parent) {
    return;
  }

  $.scrollTo(el, parent, ...args);

  // Lock the scroll position on the target element for up to 3 seconds while
  // nearby images are loaded and rendered.
  for (var image of parent.getElementsByTagName("img")) {
    if (!image.complete) {
      (function () {
        let timeout;
        const onLoad = function (event) {
          clearTimeout(timeout);
          unbind(event.target);
          return $.scrollTo(el, parent, ...Array.from(args));
        };

        var unbind = (target) => $.off(target, "load", onLoad);

        $.on(image, "load", onLoad);
        return (timeout = setTimeout(unbind.bind(null, image), 3000));
      })();
    }
  }
};

// Calls the function while locking the element's position relative to the window.
$.lockScroll = function (el, fn) {
  const parent = $.scrollParent(el);
  if (parent) {
    let { top } = $.rect(el);
    if (![document.body, document.documentElement].includes(parent)) {
      top -= $.rect(parent).top;
    }
    fn();
    parent.scrollTop = $.offset(el, parent).top - top;
  } else {
    fn();
  }
};

// If `el` is inside any `<details>` elements, expand them.
$.openDetailsAncestors = function (el) {
  while (el) {
    if (el.tagName === "DETAILS") {
      el.open = true;
    }
    el = el.parentElement;
  }
}

let smoothScroll =
  (smoothStart =
  smoothEnd =
  smoothDistance =
  smoothDuration =
    null);

$.smoothScroll = function (el, end) {
  smoothEnd = end;

  if (smoothScroll) {
    const newDistance = smoothEnd - smoothStart;
    smoothDuration += Math.min(300, Math.abs(smoothDistance - newDistance));
    smoothDistance = newDistance;
    return;
  }

  smoothStart = el.scrollTop;
  smoothDistance = smoothEnd - smoothStart;
  smoothDuration = Math.min(300, Math.abs(smoothDistance));
  const startTime = Date.now();

  smoothScroll = function () {
    const p = Math.min(1, (Date.now() - startTime) / smoothDuration);
    const y = Math.max(
      0,
      Math.floor(
        smoothStart +
          smoothDistance * (p < 0.5 ? 2 * p * p : p * (4 - p * 2) - 1),
      ),
    );
    el.scrollTop = y;
    if (p === 1) {
      return (smoothScroll = null);
    } else {
      return requestAnimationFrame(smoothScroll);
    }
  };
  return requestAnimationFrame(smoothScroll);
};

//
// Utilities
//

$.extend = function (target, ...objects) {
  for (var object of Array.from(objects)) {
    if (object) {
      for (var key in object) {
        var value = object[key];
        target[key] = value;
      }
    }
  }
  return target;
};

$.makeArray = function (object) {
  if (Array.isArray(object)) {
    return object;
  } else {
    return Array.prototype.slice.apply(object);
  }
};

$.arrayDelete = function (array, object) {
  const index = array.indexOf(object);
  if (index >= 0) {
    array.splice(index, 1);
    return true;
  } else {
    return false;
  }
};

// Returns true if the object is an array or a collection of DOM elements.
$.isCollection = (object) =>
  Array.isArray(object) || typeof object?.item === "function";

const ESCAPE_HTML_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
  "/": "&#x2F;",
};

const ESCAPE_HTML_REGEXP = /[&<>"'\/]/g;

$.escape = (string) =>
  string.replace(ESCAPE_HTML_REGEXP, (match) => ESCAPE_HTML_MAP[match]);

const ESCAPE_REGEXP = /([.*+?^=!:${}()|\[\]\/\\])/g;

$.escapeRegexp = (string) => string.replace(ESCAPE_REGEXP, "\\$1");

$.urlDecode = (string) => decodeURIComponent(string.replace(/\+/g, "%20"));

$.classify = function (string) {
  string = string.split("_");
  for (let i = 0; i < string.length; i++) {
    var substr = string[i];
    string[i] = substr[0].toUpperCase() + substr.slice(1);
  }
  return string.join("");
};

$.framify = function (fn, obj) {
  if (window.requestAnimationFrame) {
    return (...args) =>
      requestAnimationFrame(fn.bind(obj, ...Array.from(args)));
  } else {
    return fn;
  }
};

$.requestAnimationFrame = function (fn) {
  if (window.requestAnimationFrame) {
    requestAnimationFrame(fn);
  } else {
    setTimeout(fn, 0);
  }
};

//
// Miscellaneous
//

$.noop = function () {};

$.popup = function (value) {
  try {
    const win = window.open();
    if (win.opener) {
      win.opener = null;
    }
    win.location = value.href || value;
  } catch (error) {
    window.open(value.href || value, "_blank");
  }
};

$.isTouchScreen = () => typeof ontouchstart !== "undefined";

$.isWindows = () =>
  (navigator.platform != null
    ? navigator.platform.indexOf("Win")
    : undefined) >= 0;

let isMac = null;
$.isMac = () =>
  isMac != null
    ? isMac
    : (isMac =
        (navigator.userAgent != null
          ? navigator.userAgent.indexOf("Mac")
          : undefined) >= 0);

let isIE = null;
$.isIE = () =>
  isIE != null
    ? isIE
    : (isIE =
        (navigator.userAgent != null
          ? navigator.userAgent.indexOf("MSIE")
          : undefined) >= 0 ||
        (navigator.userAgent != null
          ? navigator.userAgent.indexOf("rv:11.0")
          : undefined) >= 0);

let isChromeForAndroid = null;
$.isChromeForAndroid = () =>
  isChromeForAndroid != null
    ? isChromeForAndroid
    : (isChromeForAndroid =
        (navigator.userAgent != null
          ? navigator.userAgent.indexOf("Android")
          : undefined) >= 0 &&
        /Chrome\/([.0-9])+ Mobile/.test(navigator.userAgent));

let isAndroid = null;
$.isAndroid = () =>
  isAndroid != null
    ? isAndroid
    : (isAndroid =
        (navigator.userAgent != null
          ? navigator.userAgent.indexOf("Android")
          : undefined) >= 0);

let isIOS = null;
$.isIOS = () =>
  isIOS != null
    ? isIOS
    : (isIOS =
        (navigator.userAgent != null
          ? navigator.userAgent.indexOf("iPhone")
          : undefined) >= 0 ||
        (navigator.userAgent != null
          ? navigator.userAgent.indexOf("iPad")
          : undefined) >= 0);

$.overlayScrollbarsEnabled = function () {
  if (!$.isMac()) {
    return false;
  }
  const div = document.createElement("div");
  div.setAttribute(
    "style",
    "width: 100px; height: 100px; overflow: scroll; position: absolute",
  );
  document.body.appendChild(div);
  const result = div.offsetWidth === div.clientWidth;
  document.body.removeChild(div);
  return result;
};

const HIGHLIGHT_DEFAULTS = {
  className: "highlight",
  delay: 1000,
};

$.highlight = function (el, options) {
  if (options == null) {
    options = {};
  }
  options = $.extend({}, HIGHLIGHT_DEFAULTS, options);
  el.classList.add(options.className);
  setTimeout(() => el.classList.remove(options.className), options.delay);
};

$.copyToClipboard = function (string) {
  let result;
  const textarea = document.createElement("textarea");
  textarea.style.position = "fixed";
  textarea.style.opacity = 0;
  textarea.value = string;
  document.body.appendChild(textarea);
  try {
    textarea.select();
    result = !!document.execCommand("copy");
  } catch (error) {
    result = false;
  } finally {
    document.body.removeChild(textarea);
  }
  return result;
};

$.easing = {
  linear(p) {
    return p;
  },
  swing(p) {
    return 0.5 - Math.cos(p * Math.PI) / 2;
  },
};

$.animate = (function () {
  const INTERVAL = 13;

  const now = () => new Date().getTime();

  const _anim = function (begin, el, changeAttr, start, end, duration, easing) {
    let pos = (now() - begin) / duration;
    if (pos >= 1.0) {
      return false;
    }
    pos = $.easing[easing](pos);
    changeAttr.call(el, start + (end - start) * pos);
    return true;
  };

  return function (el, changeAttr, start, end, duration, easing, callback) {
    let begin = undefined;
    begin = now();
    duration = duration || 1000;
    easing = easing || "swing";
    changeAttr = changeAttr || function () {};
    callback = callback || function () {};

    var step = function () {
      if (_anim(begin, el, changeAttr, start, end, duration, easing)) {
        setTimeout(step, INTERVAL);
      } else {
        changeAttr.call(el, end);
        callback.call(el, el);
      }
    };
    setTimeout(step, INTERVAL);
  };
})();

const requestAnimFrame = (() =>
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  function (callback) {
    window.setTimeout(callback, 1000 / 60);
  })();

$.decouple = function (node, event, fn) {
  let eve = undefined;
  let tracking = false;

  const captureEvent = function (e) {
    eve = e;
    track();
  };

  var track = function () {
    if (!tracking) {
      requestAnimFrame(update);
      tracking = true;
    }
  };

  var update = function () {
    fn.call(node, eve);
    tracking = false;
  };

  node.addEventListener(event, captureEvent, false);
  return captureEvent;
};
class Events {
  on(event, callback) {
    if (event.includes(" ")) {
      for (var name of event.split(" ")) {
        this.on(name, callback);
      }
    } else {
      this._callbacks ||= {};
      this._callbacks[event] ||= [];
      this._callbacks[event].push(callback);
    }
    return this;
  }

  off(event, callback) {
    let callbacks, index;
    if (event.includes(" ")) {
      for (var name of event.split(" ")) {
        this.off(name, callback);
      }
    } else if (
      (callbacks = this._callbacks?.[event]) &&
      (index = callbacks.indexOf(callback)) >= 0
    ) {
      callbacks.splice(index, 1);
      if (!callbacks.length) {
        delete this._callbacks[event];
      }
    }
    return this;
  }

  trigger(event, ...args) {
    this.eventInProgress = { name: event, args };
    const callbacks = this._callbacks?.[event];
    if (callbacks) {
      for (const callback of callbacks.slice(0)) {
        if (typeof callback === "function") {
          callback(...args);
        }
      }
    }
    this.eventInProgress = null;
    if (event !== "all") {
      this.trigger("all", event, ...args);
    }
    return this;
  }

  removeEvent(event) {
    if (this._callbacks != null) {
      for (var name of event.split(" ")) {
        delete this._callbacks[name];
      }
    }
    return this;
  }
};
// Intentionally called CookiesStore instead of CookieStore
// Calling it CookieStore causes issues when the Experimental Web Platform features flag is enabled in Chrome
// Related issue: https://github.com/freeCodeCamp/devdocs/issues/932
class CookiesStore {
  static INT = /^\d+$/;

  static onBlocked() {}

  get(key) {
    let value = Cookies.get(key);
    if (value != null && CookiesStore.INT.test(value)) {
      value = parseInt(value, 10);
    }
    return value;
  }

  set(key, value) {
    if (value === false) {
      this.del(key);
      return;
    }

    if (value === true) {
      value = 1;
    }
    if (
      value &&
      (typeof CookiesStore.INT.test === "function"
        ? CookiesStore.INT.test(value)
        : undefined)
    ) {
      value = parseInt(value, 10);
    }
    Cookies.set(key, "" + value, { path: "/", expires: 1e8 });
    if (this.get(key) !== value) {
      CookiesStore.onBlocked(key, value, this.get(key));
    }
  }

  del(key) {
    Cookies.expire(key);
  }

  reset() {
    try {
      for (var cookie of document.cookie.split(/;\s?/)) {
        Cookies.expire(cookie.split("=")[0]);
      }
      return;
    } catch (error) {}
  }

  dump() {
    const result = {};
    for (var cookie of document.cookie.split(/;\s?/)) {
      if (cookie[0] !== "_") {
        cookie = cookie.split("=");
        result[cookie[0]] = cookie[1];
      }
    }
    return result;
  }
};
this.LocalStorageStore = class LocalStorageStore {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (error) {}
  }

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {}
  }

  del(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {}
  }

  reset() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {}
  }
};
const MIME_TYPES = {
  json: "application/json",
  html: "text/html",
};

function ajax(options) {
  applyDefaults(options);
  serializeData(options);

  const xhr = new XMLHttpRequest();
  xhr.open(options.type, options.url, options.async);

  applyCallbacks(xhr, options);
  applyHeaders(xhr, options);

  xhr.send(options.data);

  if (options.async) {
    return { abort: abort.bind(undefined, xhr) };
  } else {
    return parseResponse(xhr, options);
  }

  function applyDefaults(options) {
    for (var key in ajax.defaults) {
      if (options[key] == null) {
        options[key] = ajax.defaults[key];
      }
    }
  }

  function serializeData(options) {
    if (!options.data) {
      return;
    }

    if (options.type === "GET") {
      options.url += "?" + serializeParams(options.data);
      options.data = null;
    } else {
      options.data = serializeParams(options.data);
    }
  }

  function serializeParams(params) {
    return Object.entries(params)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      )
      .join("&");
  }

  function applyCallbacks(xhr, options) {
    if (!options.async) {
      return;
    }

    xhr.timer = setTimeout(
      onTimeout.bind(undefined, xhr, options),
      options.timeout * 1000,
    );
    if (options.progress) {
      xhr.onprogress = options.progress;
    }
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        clearTimeout(xhr.timer);
        onComplete(xhr, options);
      }
    };
  }

  function applyHeaders(xhr, options) {
    if (!options.headers) {
      options.headers = {};
    }

    if (options.contentType) {
      options.headers["Content-Type"] = options.contentType;
    }

    if (
      !options.headers["Content-Type"] &&
      options.data &&
      options.type !== "GET"
    ) {
      options.headers["Content-Type"] = "application/x-www-form-urlencoded";
    }

    if (options.dataType) {
      options.headers["Accept"] =
        MIME_TYPES[options.dataType] || options.dataType;
    }

    for (var key in options.headers) {
      var value = options.headers[key];
      xhr.setRequestHeader(key, value);
    }
  }

  function onComplete(xhr, options) {
    if (200 <= xhr.status && xhr.status < 300) {
      const response = parseResponse(xhr, options);
      if (response != null) {
        onSuccess(response, xhr, options);
      } else {
        onError("invalid", xhr, options);
      }
    } else {
      onError("error", xhr, options);
    }
  }

  function onSuccess(response, xhr, options) {
    if (options.success != null) {
      options.success.call(options.context, response, xhr, options);
    }
  }

  function onError(type, xhr, options) {
    if (options.error != null) {
      options.error.call(options.context, type, xhr, options);
    }
  }

  function onTimeout(xhr, options) {
    xhr.abort();
    onError("timeout", xhr, options);
  }

  function abort(xhr) {
    clearTimeout(xhr.timer);
    xhr.onreadystatechange = null;
    xhr.abort();
  }

  function parseResponse(xhr, options) {
    if (options.dataType === "json") {
      return parseJSON(xhr.responseText);
    } else {
      return xhr.responseText;
    }
  }

  function parseJSON(json) {
    try {
      return JSON.parse(json);
    } catch (error) {}
  }
}

ajax.defaults = {
  async: true,
  dataType: "json",
  timeout: 30,
  type: "GET",
  // contentType
  // context
  // data
  // error
  // headers
  // progress
  // success
  // url
};
/*
 * Based on github.com/visionmedia/page.js
 * Licensed under the MIT license
 * Copyright 2012 TJ Holowaychuk <tj@vision-media.ca>
 */

let running = false;
let currentState = null;
const callbacks = [];

this.page = function (value, fn) {
  if (typeof value === "function") {
    page("*", value);
  } else if (typeof fn === "function") {
    const route = new Route(value);
    callbacks.push(route.middleware(fn));
  } else if (typeof value === "string") {
    page.show(value, fn);
  } else {
    page.start(value);
  }
};

page.start = function (options) {
  if (options == null) {
    options = {};
  }
  if (!running) {
    running = true;
    addEventListener("popstate", onpopstate);
    addEventListener("click", onclick);
    page.replace(currentPath(), null, null, true);
  }
};

page.stop = function () {
  if (running) {
    running = false;
    removeEventListener("click", onclick);
    removeEventListener("popstate", onpopstate);
  }
};

page.show = function (path, state) {
  if (path === currentState?.path) {
    return;
  }
  const context = new Context(path, state);
  const previousState = currentState;
  currentState = context.state;
  const res = page.dispatch(context);
  if (res) {
    currentState = previousState;
    location.assign(res);
  } else {
    context.pushState();
    updateCanonicalLink();
    track();
  }
  return context;
};

page.replace = function (path, state, skipDispatch, init) {
  let result;
  let context = new Context(path, state || currentState);
  context.init = init;
  currentState = context.state;
  if (!skipDispatch) {
    result = page.dispatch(context);
  }
  if (result) {
    context = new Context(result);
    context.init = init;
    currentState = context.state;
    page.dispatch(context);
  }
  context.replaceState();
  updateCanonicalLink();
  if (!skipDispatch) {
    track();
  }
  return context;
};

page.dispatch = function (context) {
  let i = 0;
  const next = function () {
    let fn = callbacks[i++];
    return fn?.(context, next);
  };
  return next();
};

page.canGoBack = () => !Context.isIntialState(currentState);

page.canGoForward = () => !Context.isLastState(currentState);

const currentPath = () => location.pathname + location.search + location.hash;

class Context {
  static isIntialState(state) {
    return state.id === 0;
  }

  static isLastState(state) {
    return state.id === this.stateId - 1;
  }

  static isInitialPopState(state) {
    return state.path === this.initialPath && this.stateId === 1;
  }

  static isSameSession(state) {
    return state.sessionId === this.sessionId;
  }

  constructor(path, state) {
    this.initialPath = currentPath();
    this.sessionId = Date.now();
    this.stateId = 0;
    if (path == null) {
      path = "/";
    }
    this.path = path;
    if (state == null) {
      state = {};
    }
    this.state = state;
    this.pathname = this.path.replace(
      /(?:\?([^#]*))?(?:#(.*))?$/,
      (_, query, hash) => {
        this.query = query;
        this.hash = hash;
        return "";
      },
    );

    if (this.state.id == null) {
      this.state.id = this.constructor.stateId++;
    }
    if (this.state.sessionId == null) {
      this.state.sessionId = this.constructor.sessionId;
    }
    this.state.path = this.path;
  }
  pushState() {
    location.href = this.path;
    // history.pushState(this.state, "", this.path);
  }

  replaceState() {
    try {
      history.replaceState(this.state, "", this.path);
    } catch (error) {} // NS_ERROR_FAILURE in Firefox
  }
}

class Route {
  constructor(path, options) {
    this.path = path;
    if (options == null) {
      options = {};
    }
    this.keys = [];
    this.regexp = pathToRegexp(this.path, this.keys);
  }

  middleware(fn) {
    return (context, next) => {
      let params = [];
      if (this.match(context.pathname, params)) {
        context.params = params;
        return fn(context, next);
      } else {
        return next();
      }
    };
  }

  match(path, params) {
    const matchData = this.regexp.exec(path);
    if (!matchData) {
      return;
    }

    const iterable = matchData.slice(1);
    for (let i = 0; i < iterable.length; i++) {
      var key = this.keys[i];
      var value = iterable[i];
      if (typeof value === "string") {
        value = decodeURIComponent(value);
      }
      if (key) {
        params[key.name] = value;
      } else {
        params.push(value);
      }
    }
    return true;
  }
}

var pathToRegexp = function (path, keys) {
  if (path instanceof RegExp) {
    return path;
  }

  if (path instanceof Array) {
    path = `(${path.join("|")})`;
  }
  path = path
    .replace(/\/\(/g, "(?:/")
    .replace(
      /(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g,
      (_, slash, format, key, capture, optional) => {
        if (slash == null) {
          slash = "";
        }
        if (format == null) {
          format = "";
        }
        keys.push({ name: key, optional: !!optional });
        let str = optional ? "" : slash;
        str += "(?:";
        if (optional) {
          str += slash;
        }
        str += format;
        str += capture || (format ? "([^/.]+?)" : "([^/]+?)");
        str += ")";
        if (optional) {
          str += optional;
        }
        return str;
      },
    )
    .replace(/([\/.])/g, "\\$1")
    .replace(/\*/g, "(.*)");

  return new RegExp(`^${path}$`);
};

var onpopstate = function (event) {
  if (!event.state || Context.isInitialPopState(event.state)) {
    return;
  }

  if (Context.isSameSession(event.state)) {
    page.replace(event.state.path, event.state);
  } else {
    location.reload();
  }
};

var onclick = function (event) {
  try {
    if (
      event.which !== 1 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.defaultPrevented
    ) {
      return;
    }
  } catch (error) {
    return;
  }

  let link = $.eventTarget(event);
  while (link && !(link.tagName === "A" || link.tagName === "a")) {
    link = link.parentNode;
  }

  if (!link) return;

  // If the `<a>` is in an SVG, its attributes are `SVGAnimatedString`s
  // instead of strings
  let href = link.href instanceof SVGAnimatedString
    ? new URL(link.href.baseVal, location.href).href
    : link.href;
  let target = link.target instanceof SVGAnimatedString
    ? link.target.baseVal
    : link.target;

  if (!target && isSameOrigin(href)) {
    // @w3cub
    // event.preventDefault();
    let parsedHref = new URL(href);
    let path = parsedHref.pathname + parsedHref.search + parsedHref.hash;
    path = path.replace(/^\/\/+/, "/"); // IE11 bug
    page.show(path);
  }
};

var isSameOrigin = (url) =>
  url.startsWith(`${location.protocol}//${location.hostname}`);

var updateCanonicalLink = function () {
  if (!this.canonicalLink) {
    this.canonicalLink = document.head.querySelector('link[rel="canonical"]');
  }
  return this.canonicalLink.setAttribute(
    "href",
    `https://${location.host}${location.pathname}`,
  );
};

const trackers = [];

page.track = function (fn) {
  trackers.push(fn);
};

var track = function () {
  if (app.config.env !== "production") {
    return;
  }
  if (navigator.doNotTrack === "1") {
    return;
  }
  if (navigator.globalPrivacyControl) {
    return;
  }

  const consentGiven = Cookies.get("analyticsConsent");
  const consentAsked = Cookies.get("analyticsConsentAsked");

  if (consentGiven === "1") {
    for (var tracker of trackers) {
      tracker.call();
    }
  } else if (consentGiven === undefined && consentAsked === undefined) {
    // Only ask for consent once per browser session
    Cookies.set("analyticsConsentAsked", "1");

    new app.views.Notif("AnalyticsConsent", { autoHide: null });
  }
};

this.resetAnalytics = function () {
  for (var cookie of document.cookie.split(/;\s?/)) {
    var name = cookie.split("=")[0];
    if (name[0] === "_" && name[1] !== "_") {
      Cookies.expire(name);
    }
  }
};
let defaultUrl = null;
let currentSlug = null;

const imageCache = {};
const urlCache = {};

const withImage = function (url, action) {
  if (imageCache[url]) {
    return action(imageCache[url]);
  } else {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    return (img.onload = () => {
      imageCache[url] = img;
      return action(img);
    });
  }
};

this.setFaviconForDoc = function (doc) {
  if (currentSlug === doc.slug || app.settings.get("noDocSpecificIcon")) {
    return;
  }

  const favicon = $('link[rel="icon"]');

  if (defaultUrl === null) {
    defaultUrl = favicon.href;
  }

  if (urlCache[doc.slug]) {
    favicon.href = urlCache[doc.slug];
    currentSlug = doc.slug;
    return;
  }

  const iconEl = $(`._icon-${doc.slug.split("~")[0]}`);
  if (iconEl === null) {
    return;
  }

  const styles = window.getComputedStyle(iconEl, ":before");

  const backgroundPositionX = styles["background-position-x"];
  const backgroundPositionY = styles["background-position-y"];
  if (backgroundPositionX === undefined || backgroundPositionY === undefined) {
    return;
  }

  const bgUrl = app.config.favicon_spritesheet;
  const sourceSize = 16;
  const sourceX = Math.abs(parseInt(backgroundPositionX.slice(0, -2)));
  const sourceY = Math.abs(parseInt(backgroundPositionY.slice(0, -2)));

  return withImage(bgUrl, (docImg) =>
    withImage(defaultUrl, function (defaultImg) {
      const size = defaultImg.width;

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(defaultImg, 0, 0);

      const docIconPercentage = 65;
      const destinationCoords = (size / 100) * (100 - docIconPercentage);
      const destinationSize = (size / 100) * docIconPercentage;

      ctx.drawImage(
        docImg,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        destinationCoords,
        destinationCoords,
        destinationSize,
        destinationSize,
      );

      try {
        urlCache[doc.slug] = canvas.toDataURL();
        favicon.href = urlCache[doc.slug];

        return (currentSlug = doc.slug);
      } catch (error) {
        Raven.captureException(error, { level: "info" });
        return this.resetFavicon();
      }
    }),
  );
};

this.resetFavicon = function () {
  if (defaultUrl !== null && currentSlug !== null) {
    $('link[rel="icon"]').href = defaultUrl;
    return (currentSlug = null);
  }
};
class App extends Events {
  _$ = $;
  _$$ = $$;
  _page = page;
  collections = {};
  models = {};
  templates = {};
  views = {};
  init() {
    // try @initErrorTracking() catch
    // return unless @browserCheck()
    // @showLoading()
    
    this.el = $("._app");
    this.localStorage = new LocalStorageStore();
    //@appCache = new app.AppCache if app.AppCache.isEnabled()
    // if (app.ServiceWorker.isEnabled()) {
    //   this.serviceWorker = new app.ServiceWorker();
    // }
    this.settings = new app.Settings();
    this.db = new app.DB();
    // if is index home page
    
    if (this.isHomePage()) {
      this.lzload = new app.views.Lazyload();
    }
    this.docs = new app.collections.Docs();
    this.disabledDocs = new app.collections.Docs();
    this.entries = new app.collections.Entries();

    this.router = new app.Router();
    this.shortcuts = new app.Shortcuts();
    if (this.DOC) {

      this.document = new app.views.Document();

      this.mobile = new app.views.Mobile();
      // if @isMobile()
      this.bootOne();
    } else {
      this.bootNDoc();
    }
    // else if @DOCS
    //   @bootAll()
    // else
    //   @onBootError()
  }
  browserCheck() {
    if (this.isSupportedBrowser()) {
      return true;
    }
    document.body.innerHTML = app.templates.unsupportedBrowser;
    this.hideLoadingScreen();
    return false;
  }

  initErrorTracking() {
    // Show a warning message and don't track errors when the app is loaded
    // from a domain other than our own, because things are likely to break.
    // (e.g. cross-domain requests)
    if (this.isInvalidLocation()) {
      new app.views.Notif("InvalidLocation");
    } else {
      if (this.config.sentry_dsn) {
        Raven.config(this.config.sentry_dsn, {
          release: this.config.release,
          whitelistUrls: [/devdocs/],
          includePaths: [/devdocs/],
          ignoreErrors: [/NPObject/, /NS_ERROR/, /^null$/, /EvalError/],
          tags: {
            mode: this.isSingleDoc() ? "single" : "full",
            iframe: (window.top !== window).toString(),
            electron: (!!window.process?.versions?.electron).toString(),
          },
          shouldSendCallback: () => {
            try {
              if (this.isInjectionError()) {
                this.onInjectionError();
                return false;
              }
              if (this.isAndroidWebview()) {
                return false;
              }
            } catch (error) {}
            return true;
          },
          dataCallback(data) {
            try {
              data.user ||= {};
              Object.assign(data.user, app.settings.dump());
              if (data.user.docs) {
                data.user.docs = data.user.docs.split("/");
              }
              if (app.lastIDBTransaction) {
                data.user.lastIDBTransaction = app.lastIDBTransaction;
              }
              data.tags.scriptCount = document.scripts.length;
            } catch (error) {}
            return data;
          },
        }).install();
      }
      this.previousErrorHandler = onerror;
      window.onerror = this.onWindowError.bind(this);
      CookiesStore.onBlocked = this.onCookieBlocked;
    }
  }

  bootOne() {
    this.doc = new app.models.Doc(this.DOC);
    this.docs.reset([this.doc]);
    this.doc.reset(app.INDEXDOC);
    this.start();
    // @doc.load @start.bind(@), @onBootError.bind(@), readCache: true
    // new app.views.Notice 'singleDoc', @doc
    // delete @DOC
  }
  bootNDoc() {
    this.trigger("ready");
  }

  bootAll() {
    const docs = this.settings.getDocs();
    for (var doc of this.DOCS) {
      (docs.includes(doc.slug) ? this.docs : this.disabledDocs).add(doc);
    }
    this.migrateDocs();
    this.docs.sort();
    this.disabledDocs.sort();
    this.docs.load(this.start.bind(this), this.onBootError.bind(this), {
      readCache: true,
      writeCache: true,
    });
    delete this.DOCS;
  }

  start() {
    let doc;
    for (doc of this.docs.all()) {
      this.entries.add(doc.toEntry());
    }
    for (doc of this.disabledDocs.all()) {
      this.entries.add(doc.toEntry());
    }
    for (doc of this.docs.all()) {
      this.initDoc(doc);
    }
    this.trigger("ready");
    this.router.start();
    // @hideLoading()
    // @welcomeBack() unless @doc
    this.removeEvent("ready bootError");
    // try navigator.mozApps?.getSelf().onsuccess = -> app.mozApp = true catch
  }

  initDoc(doc) {
    for (var type of doc.types.all()) {
      doc.entries.add(type.toEntry());
    }
    this.entries.add(doc.entries.all());
  }

  migrateDocs() {
    let needsSaving;
    for (var slug of this.settings.getDocs()) {
      if (!this.docs.findBy("slug", slug)) {
        var doc;

        needsSaving = true;
        if (slug === "webpack~2") {
          doc = this.disabledDocs.findBy("slug", "webpack");
        }
        if (slug === "angular~4_typescript") {
          doc = this.disabledDocs.findBy("slug", "angular");
        }
        if (slug === "angular~2_typescript") {
          doc = this.disabledDocs.findBy("slug", "angular~2");
        }
        if (!doc) {
          doc = this.disabledDocs.findBy("slug_without_version", slug);
        }
        if (doc) {
          this.disabledDocs.remove(doc);
          this.docs.add(doc);
        }
      }
    }

    if (needsSaving) {
      this.saveDocs();
    }
  }

  enableDoc(doc, _onSuccess, onError) {
    if (this.docs.contains(doc)) {
      return;
    }

    const onSuccess = () => {
      if (this.docs.contains(doc)) {
        return;
      }
      this.disabledDocs.remove(doc);
      this.docs.add(doc);
      this.docs.sort();
      this.initDoc(doc);
      this.saveDocs();
      if (app.settings.get("autoInstall")) {
        doc.install(_onSuccess, onError);
      } else {
        _onSuccess();
      }
    };

    doc.load(onSuccess, onError, { writeCache: true });
  }

  saveDocs() {
    this.settings.setDocs(this.docs.all().map((doc) => doc.slug));
    this.db.migrate();
    return this.serviceWorker != null
      ? this.serviceWorker.updateInBackground()
      : undefined;
  }

  welcomeBack() {
    let visitCount = this.settings.get("count");
    this.settings.set("count", ++visitCount);
    if (visitCount === 5) {
      new app.views.Notif("Share", { autoHide: null });
    }
    new app.views.News();
    new app.views.Updates();
    return (this.updateChecker = new app.UpdateChecker());
  }

  reboot() {
    if (location.pathname !== "/" && location.pathname !== "/settings") {
      window.location = `/#${location.pathname}`;
    } else {
      window.location = "/";
    }
  }

  reload() {
    this.docs.clearCache();
    this.disabledDocs.clearCache();
    if (this.serviceWorker) {
      this.serviceWorker.reload();
    } else {
      this.reboot();
    }
  }

  reset() {
    this.localStorage.reset();
    this.settings.reset();
    if (this.db != null) {
      this.db.reset();
    }
    if (this.serviceWorker != null) {
      this.serviceWorker.update();
    }
    window.location = "/";
  }

  showTip(tip) {
    if (this.isSingleDoc()) {
      return;
    }
    const tips = this.settings.getTips();
    if (!tips.includes(tip)) {
      tips.push(tip);
      this.settings.setTips(tips);
      new app.views.Tip(tip);
    }
  }

  hideLoadingScreen() {
    if ($.overlayScrollbarsEnabled()) {
      document.body.classList.add("_overlay-scrollbars");
    }
    document.documentElement.classList.remove("_booting");
  }

  indexHost() {
    // Can't load the index files from the host/CDN when service worker is
    // enabled because it doesn't support caching URLs that use CORS.
    return this.config[
      this.serviceWorker && this.settings.hasDocs()
        ? "index_path"
        : "docs_origin"
    ];
  }

  onBootError(...args) {
    this.trigger("bootError");
    this.hideLoadingScreen();
  }

  onQuotaExceeded() {
    if (this.quotaExceeded) {
      return;
    }
    this.quotaExceeded = true;
    new app.views.Notif("QuotaExceeded", { autoHide: null });
  }

  onCookieBlocked(key, value, actual) {
    if (this.cookieBlocked) {
      return;
    }
    this.cookieBlocked = true;
    new app.views.Notif("CookieBlocked", { autoHide: null });
    Raven.captureMessage(`CookieBlocked/${key}`, {
      level: "warning",
      extra: { value, actual },
    });
  }

  onWindowError(...args) {
    if (this.cookieBlocked) {
      return;
    }
    if (this.isInjectionError(...args)) {
      this.onInjectionError();
    } else if (this.isAppError(...args)) {
      if (typeof this.previousErrorHandler === "function") {
        this.previousErrorHandler(...args);
      }
      this.hideLoadingScreen();
      if (!this.errorNotif) {
        this.errorNotif = new app.views.Notif("Error");
      }
      this.errorNotif.show();
    }
  }

  onInjectionError() {
    if (!this.injectionError) {
      this.injectionError = true;
      alert(`\
JavaScript code has been injected in the page which prevents DevDocs from running correctly.
Please check your browser extensions/addons. `);
      Raven.captureMessage("injection error", { level: "info" });
    }
  }

  isInjectionError() {
    // Some browser extensions expect the entire web to use jQuery.
    // I gave up trying to fight back.
    return (
      window.$ !== app._$ ||
      window.$$ !== app._$$ ||
      window.page !== app._page ||
      typeof $.empty !== "function" ||
      typeof page.show !== "function"
    );
  }

  isAppError(error, file) {
    // Ignore errors from external scripts.
    return file && file.includes("devdocs") && file.endsWith(".js");
  }

  isSupportedBrowser() {
    try {
      const features = {
        bind: !!Function.prototype.bind,
        pushState: !!history.pushState,
        matchMedia: !!window.matchMedia,
        insertAdjacentHTML: !!document.body.insertAdjacentHTML,
        defaultPrevented:
          document.createEvent("CustomEvent").defaultPrevented === false,
        cssVariables: !!CSS.supports?.("(--t: 0)"),
      };

      for (var key in features) {
        var value = features[key];
        if (!value) {
          Raven.captureMessage(`unsupported/${key}`, { level: "info" });
          return false;
        }
      }

      return true;
    } catch (error) {
      Raven.captureMessage("unsupported/exception", {
        level: "info",
        extra: { error },
      });
      return false;
    }
  }

  isSingleDoc() {
    return document.body.hasAttribute("data-doc");
  }
  isHomePage() {
    // class index-page 
    return document.body.classList.contains("index-page");
  }

  isMobile() {
    return this._isMobile != null
      ? this._isMobile
      : (this._isMobile = app.views.Mobile.detect());
  }

  isAndroidWebview() {
    return this._isAndroidWebview != null
      ? this._isAndroidWebview
      : (this._isAndroidWebview = app.views.Mobile.detectAndroidWebview());
  }

  isInvalidLocation() {
    return (
      this.config.env === "production" &&
      !location.host.startsWith(app.config.production_host)
    );
  }
}

this.app = new App();
app.Settings = class Settings {
  static PREFERENCE_KEYS = [
    "hideDisabled",
    "hideIntro",
    "manualUpdate",
    "fastScroll",
    "arrowScroll",
    "analyticsConsent",
    "docs",
    "dark", // legacy
    "theme",
    "layout",
    "size",
    "tips",
    "noAutofocus",
    "autoInstall",
    "spaceScroll",
    "spaceTimeout",
    "noDocSpecificIcon",
  ];

  static INTERNAL_KEYS = ["count", "schema", "version", "news"];

  static LAYOUTS = [
    "_max-width",
    "_sidebar-hidden",
    "_native-scrollbars",
    "_text-justify-hyphenate",
  ];

  static defaults = {
    count: 0,
    hideDisabled: false,
    hideIntro: false,
    news: 0,
    manualUpdate: false,
    schema: 1,
    analyticsConsent: false,
    theme: "auto",
    spaceScroll: 1,
    spaceTimeout: 0.5,
    noDocSpecificIcon: false,
  };

  constructor() {
    this.store = new CookiesStore();
    this.cache = {};
    this.autoSupported =
      window.matchMedia("(prefers-color-scheme)").media !== "not all";
    if (this.autoSupported) {
      this.darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
      this.darkModeQuery.addListener(() => this.setTheme(this.get("theme")));
    }
  }

  get(key) {
    let left;
    if (this.cache.hasOwnProperty(key)) {
      return this.cache[key];
    }
    this.cache[key] =
      (left = this.store.get(key)) != null
        ? left
        : this.constructor.defaults[key];
    if (key === "theme" && this.cache[key] === "auto" && !this.darkModeQuery) {
      return (this.cache[key] = "default");
    } else {
      return this.cache[key];
    }
  }

  set(key, value) {
    this.store.set(key, value);
    delete this.cache[key];
    if (key === "theme") {
      this.setTheme(value);
    }
  }

  del(key) {
    this.store.del(key);
    delete this.cache[key];
  }

  hasDocs() {
    try {
      return !!this.store.get("docs");
    } catch (error) {}
  }

  getDocs() {
    return this.store.get("docs")?.split("/") || app.config.default_docs;
  }

  setDocs(docs) {
    this.set("docs", docs.join("/"));
  }

  getTips() {
    return this.store.get("tips")?.split("/") || [];
  }

  setTips(tips) {
    this.set("tips", tips.join("/"));
  }

  setLayout(name, enable) {
    this.toggleLayout(name, enable);

    const layout = (this.store.get("layout") || "").split(" ");
    $.arrayDelete(layout, "");

    if (enable) {
      if (!layout.includes(name)) {
        layout.push(name);
      }
    } else {
      $.arrayDelete(layout, name);
    }

    if (layout.length > 0) {
      this.set("layout", layout.join(" "));
    } else {
      this.del("layout");
    }
  }

  hasLayout(name) {
    const layout = (this.store.get("layout") || "").split(" ");
    return layout.includes(name);
  }

  setSize(value) {
    this.set("size", value);
  }

  dump() {
    return this.store.dump();
  }

  export() {
    const data = this.dump();
    for (var key of Settings.INTERNAL_KEYS) {
      delete data[key];
    }
    return data;
  }

  import(data) {
    let key, value;
    const object = this.export();
    for (key in object) {
      value = object[key];
      if (!data.hasOwnProperty(key)) {
        this.del(key);
      }
    }
    for (key in data) {
      value = data[key];
      if (Settings.PREFERENCE_KEYS.includes(key)) {
        this.set(key, value);
      }
    }
  }

  reset() {
    this.store.reset();
    this.cache = {};
  }

  initLayout() {
    if (this.get("dark") === 1) {
      this.set("theme", "dark");
      this.del("dark");
    }
    this.setTheme(this.get("theme"));
    for (var layout of app.Settings.LAYOUTS) {
      this.toggleLayout(layout, this.hasLayout(layout));
    }
    this.initSidebarWidth();
  }

  setTheme(theme) {
    if (theme === "auto") {
      theme = this.darkModeQuery.matches ? "dark" : "default";
    }
    const { classList } = document.documentElement;
    classList.remove("_theme-default", "_theme-dark");
    classList.add("_theme-" + theme);
    this.updateColorMeta();
  }

  updateColorMeta() {
    const color = getComputedStyle(document.documentElement)
      .getPropertyValue("--headerBackground")
      .trim();
    $("meta[name=theme-color]").setAttribute("content", color);
  }

  toggleLayout(layout, enable) {
    const { classList } = document.body;
    // sidebar is always shown for settings; its state is updated in app.views.Settings
    if (layout !== "_sidebar-hidden" || !app.router?.isSettings) {
      classList.toggle(layout, enable);
    }
    classList.toggle("_overlay-scrollbars", $.overlayScrollbarsEnabled());
  }

  initSidebarWidth() {
    const size = this.get("size");
    if (size) {
      document.documentElement.style.setProperty("--sidebarWidth", size + "px");
    }
  }
};
app.DB = class DB {
  static NAME = "docs";
  static VERSION = 15;

  constructor() {
    this.versionMultipler = $.isIE() ? 1e5 : 1e9;
    this.useIndexedDB = this.useIndexedDB();
    this.callbacks = [];
  }

  db(fn) {
    if (!this.useIndexedDB) {
      return fn();
    }
    if (fn) {
      this.callbacks.push(fn);
    }
    if (this.open) {
      return;
    }

    try {
      this.open = true;
      const req = indexedDB.open(
        DB.NAME,
        DB.VERSION * this.versionMultipler + this.userVersion(),
      );
      req.onsuccess = (event) => this.onOpenSuccess(event);
      req.onerror = (event) => this.onOpenError(event);
      req.onupgradeneeded = (event) => this.onUpgradeNeeded(event);
    } catch (error) {
      this.fail("exception", error);
    }
  }

  onOpenSuccess(event) {
    let error;
    const db = event.target.result;

    if (db.objectStoreNames.length === 0) {
      try {
        db.close();
      } catch (error1) {}
      this.open = false;
      this.fail("empty");
    } else if ((error = this.buggyIDB(db))) {
      try {
        db.close();
      } catch (error2) {}
      this.open = false;
      this.fail("buggy", error);
    } else {
      this.runCallbacks(db);
      this.open = false;
      db.close();
    }
  }

  onOpenError(event) {
    event.preventDefault();
    this.open = false;
    const { error } = event.target;

    switch (error.name) {
      case "QuotaExceededError":
        this.onQuotaExceededError();
        break;
      case "VersionError":
        this.onVersionError();
        break;
      case "InvalidStateError":
        this.fail("private_mode");
        break;
      default:
        this.fail("cant_open", error);
    }
  }

  fail(reason, error) {
    this.cachedDocs = null;
    this.useIndexedDB = false;
    if (!this.reason) {
      this.reason = reason;
    }
    if (!this.error) {
      this.error = error;
    }
    if (error) {
      if (typeof console.error === "function") {
        console.error("IDB error", error);
      }
    }
    this.runCallbacks();
    if (error && reason === "cant_open") {
      Raven.captureMessage(`${error.name}: ${error.message}`, {
        level: "warning",
        fingerprint: [error.name],
      });
    }
  }

  onQuotaExceededError() {
    this.reset();
    this.db();
    app.onQuotaExceeded();
    Raven.captureMessage("QuotaExceededError", { level: "warning" });
  }

  onVersionError() {
    const req = indexedDB.open(DB.NAME);
    req.onsuccess = (event) => {
      return this.handleVersionMismatch(event.target.result.version);
    };
    req.onerror = function (event) {
      event.preventDefault();
      return this.fail("cant_open", error);
    };
  }

  handleVersionMismatch(actualVersion) {
    if (Math.floor(actualVersion / this.versionMultipler) !== DB.VERSION) {
      this.fail("version");
    } else {
      this.setUserVersion(actualVersion - DB.VERSION * this.versionMultipler);
      this.db();
    }
  }

  buggyIDB(db) {
    if (this.checkedBuggyIDB) {
      return;
    }
    this.checkedBuggyIDB = true;
    try {
      this.idbTransaction(db, {
        stores: $.makeArray(db.objectStoreNames).slice(0, 2),
        mode: "readwrite",
      }).abort(); // https://bugs.webkit.org/show_bug.cgi?id=136937
      return;
    } catch (error) {
      return error;
    }
  }

  runCallbacks(db) {
    let fn;
    while ((fn = this.callbacks.shift())) {
      fn(db);
    }
  }

  onUpgradeNeeded(event) {
    const db = event.target.result;
    if (!db) {
      return;
    }

    const objectStoreNames = $.makeArray(db.objectStoreNames);

    if (!$.arrayDelete(objectStoreNames, "docs")) {
      try {
        db.createObjectStore("docs");
      } catch (error) {}
    }

    for (var doc of app.docs.all()) {
      if (!$.arrayDelete(objectStoreNames, doc.slug)) {
        try {
          db.createObjectStore(doc.slug);
        } catch (error1) {}
      }
    }

    for (var name of objectStoreNames) {
      try {
        db.deleteObjectStore(name);
      } catch (error2) {}
    }
  }

  store(doc, data, onSuccess, onError, _retry) {
    if (_retry == null) {
      _retry = true;
    }
    this.db((db) => {
      if (!db) {
        onError();
        return;
      }

      const txn = this.idbTransaction(db, {
        stores: ["docs", doc.slug],
        mode: "readwrite",
        ignoreError: false,
      });
      txn.oncomplete = () => {
        if (this.cachedDocs != null) {
          this.cachedDocs[doc.slug] = doc.mtime;
        }
        onSuccess();
      };
      txn.onerror = (event) => {
        event.preventDefault();
        if (txn.error?.name === "NotFoundError" && _retry) {
          this.migrate();
          setTimeout(() => {
            return this.store(doc, data, onSuccess, onError, false);
          }, 0);
        } else {
          onError(event);
        }
      };

      let store = txn.objectStore(doc.slug);
      store.clear();
      for (var path in data) {
        var content = data[path];
        store.add(content, path);
      }

      store = txn.objectStore("docs");
      store.put(doc.mtime, doc.slug);
    });
  }

  unstore(doc, onSuccess, onError, _retry) {
    if (_retry == null) {
      _retry = true;
    }
    this.db((db) => {
      if (!db) {
        onError();
        return;
      }

      const txn = this.idbTransaction(db, {
        stores: ["docs", doc.slug],
        mode: "readwrite",
        ignoreError: false,
      });
      txn.oncomplete = () => {
        if (this.cachedDocs != null) {
          delete this.cachedDocs[doc.slug];
        }
        onSuccess();
      };
      txn.onerror = function (event) {
        event.preventDefault();
        if (txn.error?.name === "NotFoundError" && _retry) {
          this.migrate();
          setTimeout(() => {
            return this.unstore(doc, onSuccess, onError, false);
          }, 0);
        } else {
          onError(event);
        }
      };

      let store = txn.objectStore("docs");
      store.delete(doc.slug);

      store = txn.objectStore(doc.slug);
      store.clear();
    });
  }

  version(doc, fn) {
    const version = this.cachedVersion(doc);
    if (version != null) {
      fn(version);
      return;
    }

    this.db((db) => {
      if (!db) {
        fn(false);
        return;
      }

      const txn = this.idbTransaction(db, {
        stores: ["docs"],
        mode: "readonly",
      });
      const store = txn.objectStore("docs");

      const req = store.get(doc.slug);
      req.onsuccess = function () {
        fn(req.result);
      };
      req.onerror = function (event) {
        event.preventDefault();
        fn(false);
      };
    });
  }

  cachedVersion(doc) {
    if (!this.cachedDocs) {
      return;
    }
    return this.cachedDocs[doc.slug] || false;
  }

  versions(docs, fn) {
    const versions = this.cachedVersions(docs);
    if (versions) {
      fn(versions);
      return;
    }

    return this.db((db) => {
      if (!db) {
        fn(false);
        return;
      }

      const txn = this.idbTransaction(db, {
        stores: ["docs"],
        mode: "readonly",
      });
      txn.oncomplete = function () {
        fn(result);
      };
      const store = txn.objectStore("docs");
      var result = {};

      docs.forEach((doc) => {
        const req = store.get(doc.slug);
        req.onsuccess = function () {
          result[doc.slug] = req.result;
        };
        req.onerror = function (event) {
          event.preventDefault();
          result[doc.slug] = false;
        };
      });
    });
  }

  cachedVersions(docs) {
    if (!this.cachedDocs) {
      return;
    }
    const result = {};
    for (var doc of docs) {
      result[doc.slug] = this.cachedVersion(doc);
    }
    return result;
  }

  load(entry, onSuccess, onError) {
    if (this.shouldLoadWithIDB(entry)) {
      return this.loadWithIDB(entry, onSuccess, () =>
        this.loadWithXHR(entry, onSuccess, onError)
      );
    } else {
      return this.loadWithXHR(entry, onSuccess, onError);
    }
  }

  loadWithXHR(entry, onSuccess, onError) {
    return ajax({
      url: entry.fileUrl(),
      dataType: "html",
      success: onSuccess,
      error: onError,
    });
  }

  loadWithIDB(entry, onSuccess, onError) {
    return this.db((db) => {
      if (!db) {
        onError();
        return;
      }

      if (!db.objectStoreNames.contains(entry.doc.slug)) {
        onError();
        this.loadDocsCache(db);
        return;
      }

      const txn = this.idbTransaction(db, {
        stores: [entry.doc.slug],
        mode: "readonly",
      });
      const store = txn.objectStore(entry.doc.slug);

      const req = store.get(entry.dbPath());
      req.onsuccess = function () {
        if (req.result) {
          onSuccess(req.result);
        } else {
          onError();
        }
      };
      req.onerror = function (event) {
        event.preventDefault();
        onError();
      };
      this.loadDocsCache(db);
    });
  }

  loadDocsCache(db) {
    if (this.cachedDocs) {
      return;
    }
    this.cachedDocs = {};

    const txn = this.idbTransaction(db, {
      stores: ["docs"],
      mode: "readonly",
    });
    txn.oncomplete = () => {
      setTimeout(() => this.checkForCorruptedDocs(), 50);
    };

    const req = txn.objectStore("docs").openCursor();
    req.onsuccess = (event) => {
      const cursor = event.target.result;
      if (!cursor) {
        return;
      }
      this.cachedDocs[cursor.key] = cursor.value;
      cursor.continue();
    };
    req.onerror = function (event) {
      event.preventDefault();
    };
  }

  checkForCorruptedDocs() {
    this.db((db) => {
      let slug;
      this.corruptedDocs = [];
      const docs = (() => {
        const result = [];
        for (var key in this.cachedDocs) {
          var value = this.cachedDocs[key];
          if (value) {
            result.push(key);
          }
        }
        return result;
      })();
      if (docs.length === 0) {
        return;
      }

      for (slug of docs) {
        if (!app.docs.findBy("slug", slug)) {
          this.corruptedDocs.push(slug);
        }
      }

      for (slug of this.corruptedDocs) {
        $.arrayDelete(docs, slug);
      }

      if (docs.length === 0) {
        setTimeout(() => this.deleteCorruptedDocs(), 0);
        return;
      }

      const txn = this.idbTransaction(db, {
        stores: docs,
        mode: "readonly",
        ignoreError: false,
      });
      txn.oncomplete = () => {
        if (this.corruptedDocs.length > 0) {
          setTimeout(() => this.deleteCorruptedDocs(), 0);
        }
      };

      for (var doc of docs) {
        txn.objectStore(doc).get("index").onsuccess = (event) => {
          if (!event.target.result) {
            this.corruptedDocs.push(event.target.source.name);
          }
        };
      }
    });
  }

  deleteCorruptedDocs() {
    this.db((db) => {
      let doc;
      const txn = this.idbTransaction(db, {
        stores: ["docs"],
        mode: "readwrite",
        ignoreError: false,
      });
      const store = txn.objectStore("docs");
      while ((doc = this.corruptedDocs.pop())) {
        this.cachedDocs[doc] = false;
        store.delete(doc);
      }
    });
    Raven.captureMessage("corruptedDocs", {
      level: "info",
      extra: { docs: this.corruptedDocs.join(",") },
    });
  }

  shouldLoadWithIDB(entry) {
    return (
      this.useIndexedDB && (!this.cachedDocs || this.cachedDocs[entry.doc.slug])
    );
  }

  idbTransaction(db, options) {
    app.lastIDBTransaction = [options.stores, options.mode];
    const txn = db.transaction(options.stores, options.mode);
    if (options.ignoreError !== false) {
      txn.onerror = function (event) {
        event.preventDefault();
      };
    }
    if (options.ignoreAbort !== false) {
      txn.onabort = function (event) {
        event.preventDefault();
      };
    }
    return txn;
  }

  reset() {
    try {
      indexedDB?.deleteDatabase(DB.NAME);
    } catch (error) {}
  }

  useIndexedDB() {
    try {
      if (!app.isSingleDoc() && window.indexedDB) {
        return true;
      } else {
        this.reason = "not_supported";
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  migrate() {
    app.settings.set("schema", this.userVersion() + 1);
  }

  setUserVersion(version) {
    app.settings.set("schema", version);
  }

  userVersion() {
    return app.settings.get("schema");
  }
};
var app = app || {};
app.config = {
  db_filename: "db.json",
  default_docs: ["css", "dom", "html", "http", "javascript"],
  docs_aliases: {
    angular: "ng",
    "angular.js": "ng",
    backbone: "bb",
    cpp: "c++",
    coffeescript: "cs",
    crystal: "cr",
    elixir: "ex",
    javascript: "js",
    julia: "jl",
    jquery: "$",
    knockout: "ko",
    kubernetes: "k8s",
    less: "ls",
    lodash: "_",
    love: "löve",
    marionette: "mn",
    markdown: "md",
    matplotlib: "mpl",
    modernizr: "mdr",
    moment: "mt",
    openjdk: "java",
    nginx: "ngx",
    numpy: "np",
    pandas: "pd",
    postgresql: "pg",
    python: "py",
    rails: "ror",
    ruby: "rb",
    rust: "rs",
    sass: "scss",
    tensorflow: "tf",
    typescript: "ts",
    "underscore.js": "_",
  },
  docs_origin: "//docs.w3cub.com",
  env: "production",
  history_cache_size: 10,
  index_filename: "index.json",
  index_path: "/docs",
  max_results: 50,
  production_host: "docs.w3cub.com",
  search_param: "q",
  sentry_dsn:
    "https://5df3f4c982314008b52b799b1f25ad9d@app.getsentry.com/11245",
  version: 1772654593,
  release: "Wed, 04 Mar 2026 20:03:13 GMT",
  mathml_stylesheet: "/mathml.css",
  favicon_spritesheet:
    "/assets/sprites/docs-7dc473dfd0d964445f54117c69df53b251ace4b68618ca2daa039e07fc104c55.png",
  service_worker_path: "/service-worker.js",
  service_worker_enabled: false,
};

app.collections = {};
app.models = {};
app.views = {};
const detectAdBlocker = () => {
  const blockedElement = document.createElement("div");
  blockedElement.className =
    "pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links ad-text adSense adBlock adContent adBanner";
  blockedElement.setAttribute(
    "style",
    "width: 1px !important; height: 1px !important; position: absolute !important; left: -10000px !important; top: -1000px !important;",
  );
  document.body.appendChild(blockedElement);
  return (
    window.document.body.getAttribute("abp") != null ||
    blockedElement.offsetParent == null ||
    blockedElement.offsetHeight === 0 ||
    blockedElement.offsetLeft === 0 ||
    blockedElement.offsetTop === 0 ||
    blockedElement.offsetWidth === 0 ||
    blockedElement.clientHeight === 0 ||
    blockedElement.clientWidth === 0
  );
};
var app = app || {};
window.reload2022 = () => {
  location.reload();
};
window.redirect2022 = (url) => {
  location.href = url;
};

function getCookie(name) {
  var v = document.cookie.match("(^|;) ?" + name + "=([^;]*)(;|$)");
  return v ? v[2] : null;
}
function setCookie(name, value, days) {
  var d = new Date();
  d.setTime(d.getTime() + 24 * 60 * 60 * 1000 * days);
  document.cookie = name + "=" + value + ";path=/;expires=" + d.toGMTString();
}

var makeElement = () => {
  var blockElement = document.createElement("div");
  blockElement.className = "el-container";
  document.body.classList.add("el-dialog_active");
  blockElement.innerHTML = `
  <style type="text/css">
  body.el-dialog_active {
    overflow: hidden !important;
  }
  .el-dialog-overlay {
    position: fixed;
    background-color: #000;
    z-index: 1023;
    height: 100%;
    width: 100%;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    opacity: 0;
    transition: opacity 0.45s cubic-bezier(0.23, 1, 0.32, 1);
  }

  .el-dialog-overlay.active {
    opacity: 0.6;
  }

  .el-dialog-overlay:not(.active),
  .el-dialog:not(.el-dialog-show) {
    display: none;
  }

  .el-dialog {
    color: #000;
    position: fixed;
    z-index: 1024;
    border-radius: 2px;
    width: 35%;
    background-color: #fff;
    box-shadow: 0 2px 2px 0 rgb(0 0 0 / 7%);
    left: 35%;
    top: 15%;
    font-size: 16px;
    text-align: center;
    border-radius: 10px;
  }

  .el-dialog-title {
    padding: 24px 24px 20px;
    font-size: 20px;
    color: #000;
    line-height: 1;
    padding-top: 0;
  }

  .el-dialog-content {
    text-align: justify;
    padding: 24px;
    padding-top: 0;
  }

  .el-dialog-message {
    margin: 0;
    padding: 0;
    color: #000;
    font-size: 13px;
    line-height: 1.5;
  }

  .el-dialog-icon.logo {
    width: 100px;
    padding: 1rem;
  }

  .el-dialog {
    padding: 10px;
  }

  .el-dialog-footer {
    padding: 10px;
    padding-top: 0;
  }

  .el-dialog-footer a {
    background-color: #372ac7;
    color: #ffffff;
    width: 100%;
  }

  .el-dialog:not(.el-dialog-show) {
    display: none;
  }

  .el-dialog .el-dialog_body .el-dialog_image_wrapper {
    padding-top: 1rem;
    padding-bottom: 0;
  }

  .el-dialog .el-dialog_body .el-dialog_content .title {
    font-size: 25px;
    font-weight: 400;
    margin: 1rem;
  }

  .el-dialog .el-dialog_body .el-dialog_content .subtitle {
    padding: 0 1rem;
  }

  .el-dialog_buttons {
    width: 100%;
    align-items: center;
    display: flex;
    justify-content: space-around;
    border-top: 1px solid #d6d6d6;
    border-bottom: 1px solid #d6d6d6;
  }

  .el-dialog_buttons_row+.el-dialog_buttons_row {
    border-left: 1px solid #d6d6d6;
  }

  .el-dialog_buttons .el-dialog_buttons_row {
    flex: 1 1 auto;
    padding: 1rem;
  }

  .el-dialog_buttons_row div {
    margin: 0;
    font-size: 16px;
    font-weight: 400;
    margin-bottom: 0.3rem;
  }

  .el-dialog_buttons_row button {
    background: #ED1E45;
    border: 1px solid #ED1E45;
    width: 90%;
    padding: 0.4rem;
    color: #fff;
    text-transform: uppercase;
    font-weight: bold;
    cursor: pointer;
    text-decoration: none;
    border-radius: 0.3rem;
  }

  .el-dialog_footer {
    display: flex;
    justify-content: space-between;
    padding: 1rem;
  }

  .el-dialog_footer a,
  .el-dialog_footer a:focus {
    text-decoration: none;
    color: #000;
    font-size: 12px;
    font-weight: bold;
    border: none;
    outline: none;
  }

  @media only screen and (max-width:800px) {
    .el-dialog,
    .el-dialog {
      width: calc(35% + 25%);
      left: calc(35% - 10%);
      top: 10%;
    }
  }

  @media only screen and (max-width:500px) {
    .el-dialog,
    .el-dialog {
      width: 95%;
      left: 2%;
      top: 5%;
    }
  }
</style>
<div class="el-dialog-overlay active" id="el-dialog-overlay" tabindex="-1"></div>
<div class="el-dialog el-dialog-hide el-dialog-show" id="el-dialog-modal">
  <div class="el-dialog-modal-container" id="el-dialog-modal-container">
    <div class="el-dialog_body">
      <div class="el-dialog-wrapper">
        <img  src="/images/antivda.svg" class="el-dialog-icon logo" alt="" />
      </div>
      <div class="el-dialog_content">
        <p class="title">Ads Blocker Detected!!!</p>
        <p class="subtitle">We have detected that you are using extensions to block ads. Please support us by disabling
          these ads blocker.</p>
        <div class="el-dialog_buttons">
          <div class="el-dialog_buttons_row">
            <p>Disable Ad Block</p>
            <button type="button" onclick="reload2022()">I've disable Adblock</button>
          </div>
          <div class="el-dialog_buttons_row">
            <p>Donate me</p>
            <button type="button" onclick="redirect2022('/about/')">Go to Donate me</button>
          </div>
        </div>
      </div>
    </div>
    <div class="el-dialog_footer">
      <a href="/about/#whitelist">How to Whitelist a Website?</a>
      <a href="/privacy-policy">Privacy Policy</a>
    </div>
  </div>
</div>
`;
  document.body.appendChild(blockElement);
};

const creaBlocktElement = () => {
  setTimeout(() => {
    // exist adblock or had been detected
    if (getCookie("vda") != "1") {
      if (detectAdBlocker()) {
        // body append the anti adblocker element
        makeElement();
      }
    }
  }, 1000);
};



app.on("ready", () => {
  fetch("/conf/conf.json")
    .then((res) => res.json())
    .then((res) => {
      if (res.vda.action) {
        creaBlocktElement();
      }
    })
    .catch((err) => {
      creaBlocktElement();
    });
});
app.Router = class Router extends Events {
  static routes = [
    ["*", "before"],
    ["/", "root"],
    ["/settings", "settings"],
    ["/offline", "offline"],
    ["/about", "about"],
    ["/news", "news"],
    ["/help", "help"],
    ["/:doc-:type/", "type"],
    ["/:doc/", "doc"],
    ["/:doc/:path(*)", "entry"],
    ["*", "notFound"],
  ];

  constructor() {
    super();
    for (var [path, method] of this.constructor.routes) {
      page(path, this[method].bind(this));
    }
    this.setInitialPath();
  }

  start() {
    page.start();
  }

  show(path) {
    page.show(path);
  }

  triggerRoute(name) {
    this.trigger(name, this.context);
    this.trigger("after", name, this.context);
  }

  before(context, next) {
    const previousContext = this.context;
    this.context = context;
    this.trigger("before", context);

    const res = next();
    if (res) {
      this.context = previousContext;
      return res;
    } else {
      return;
    }
  }

  doc(context, next) {
    let doc;
    if (
      (doc =
        app.docs.findBySlug(context.params.doc) ||
        app.disabledDocs.findBySlug(context.params.doc))
    ) {
      context.doc = doc;
      context.entry = doc.toEntry();
      this.triggerRoute("entry");
      return;
    } else {
      return next();
    }
  }

  type(context, next) {
    const doc = app.docs.findBySlug(context.params.doc);
    const type = doc?.types?.findBy("slug", context.params.type);

    if (type) {
      context.doc = doc;
      context.type = type;
      this.triggerRoute("type");
      return;
    } else {
      return next();
    }
  }

  entry(context, next) {
    const doc = app.docs.findBySlug(context.params.doc);
    if (!doc) {
      return next();
    }
    let { path } = context.params;
    const { hash } = context;

    let entry = doc.findEntryByPathAndHash(path, hash);
    if (entry) {
      context.doc = doc;
      context.entry = entry;
      this.triggerRoute("entry");
      return;
    } else if (path.slice(-6) === "/index") {
      path = path.substr(0, path.length - 6);
      entry = doc.findEntryByPathAndHash(path, hash);
      if (entry) {
        return entry.fullPath();
      }
    } else {
      path = `${path}/index`;
      entry = doc.findEntryByPathAndHash(path, hash);
      if (entry) {
        return entry.fullPath();
      }
    }

    return next();
  }

  root() {
    if (app.isSingleDoc()) {
      return "/";
    }
    this.triggerRoute("root");
  }

  settings(context) {
    if (app.isSingleDoc()) {
      return `/#/${context.path}`;
    }
    this.triggerRoute("settings");
  }

  offline(context) {
    if (app.isSingleDoc()) {
      return `/#/${context.path}`;
    }
    this.triggerRoute("offline");
  }

  about(context) {
    if (app.isSingleDoc()) {
      return `/#/${context.path}`;
    }
    context.page = "about";
    this.triggerRoute("page");
  }

  news(context) {
    if (app.isSingleDoc()) {
      return `/#/${context.path}`;
    }
    context.page = "news";
    this.triggerRoute("page");
  }

  help(context) {
    if (app.isSingleDoc()) {
      return `/#/${context.path}`;
    }
    context.page = "help";
    this.triggerRoute("page");
  }

  notFound(context) {
    this.triggerRoute("notFound");
  }

  isIndex() {
    return (
      this.context?.path === "/" ||
      (app.isSingleDoc() && this.context?.entry?.isIndex())
    );
  }

  isSettings() {
    return this.context?.path === "/settings";
  }

  setInitialPath() {
    // Remove superfluous forward slashes at the beginning of the path
    let path = location.pathname.replace(/^\/{2,}/g, "/");
    if (path !== location.pathname) {
      page.replace(path + location.search + location.hash, null, true);
    }

    if (location.pathname === "/") {
      if ((path = this.getInitialPathFromHash())) {
        page.replace(path + location.search, null, true);
      } else if ((path = this.getInitialPathFromCookie())) {
        page.replace(path + location.search + location.hash, null, true);
      }
    }
  }

  getInitialPathFromHash() {
    try {
      return new RegExp("#/(.+)").exec(decodeURIComponent(location.hash))?.[1];
    } catch (error) {}
  }

  getInitialPathFromCookie() {
    const path = Cookies.get("initial_path");
    if (path) {
      Cookies.expire("initial_path");
      return path;
    }
  }

  replaceHash(hash) {
    page.replace(
      location.pathname + location.search + (hash || ""),
      null,
      true
    );
  }
};
//
// Match functions
//

let fuzzyRegexp,
  i,
  index,
  lastIndex,
  match,
  matcher,
  matchIndex,
  matchLength,
  queryLength,
  score,
  separators,
  value,
  valueLength;
const SEPARATOR = ".";

let query =
  (queryLength =
  value =
  valueLength =
  matcher = // current match function
  fuzzyRegexp = // query fuzzy regexp
  index = // position of the query in the string being matched
  lastIndex = // last position of the query in the string being matched
  match = // regexp match data
  matchIndex =
  matchLength =
  score = // score for the current match
  separators = // counter
  i =
    null); // cursor

function exactMatch() {
  index = value.indexOf(query);
  if (!(index >= 0)) {
    return;
  }

  lastIndex = value.lastIndexOf(query);

  if (index !== lastIndex) {
    return Math.max(
      scoreExactMatch(),
      ((index = lastIndex) && scoreExactMatch()) || 0,
    );
  } else {
    return scoreExactMatch();
  }
}

function scoreExactMatch() {
  // Remove one point for each unmatched character.
  score = 100 - (valueLength - queryLength);

  if (index > 0) {
    // If the character preceding the query is a dot, assign the same score
    // as if the query was found at the beginning of the string, minus one.
    if (value.charAt(index - 1) === SEPARATOR) {
      score += index - 1;
      // Don't match a single-character query unless it's found at the beginning
      // of the string or is preceded by a dot.
    } else if (queryLength === 1) {
      return;
      // (1) Remove one point for each unmatched character up to the nearest
      //     preceding dot or the beginning of the string.
      // (2) Remove one point for each unmatched character following the query.
    } else {
      i = index - 2;
      while (i >= 0 && value.charAt(i) !== SEPARATOR) {
        i--;
      }
      score -=
        index -
        i + // (1)
        (valueLength - queryLength - index); // (2)
    }

    // Remove one point for each dot preceding the query, except for the one
    // immediately before the query.
    separators = 0;
    i = index - 2;
    while (i >= 0) {
      if (value.charAt(i) === SEPARATOR) {
        separators++;
      }
      i--;
    }
    score -= separators;
  }

  // Remove five points for each dot following the query.
  separators = 0;
  i = valueLength - queryLength - index - 1;
  while (i >= 0) {
    if (value.charAt(index + queryLength + i) === SEPARATOR) {
      separators++;
    }
    i--;
  }
  score -= separators * 5;

  return Math.max(1, score);
}

function fuzzyMatch() {
  if (valueLength <= queryLength || value.includes(query)) {
    return;
  }
  if (!(match = fuzzyRegexp.exec(value))) {
    return;
  }
  matchIndex = match.index;
  matchLength = match[0].length;
  score = scoreFuzzyMatch();
  if (
    (match = fuzzyRegexp.exec(
      value.slice((i = value.lastIndexOf(SEPARATOR) + 1)),
    ))
  ) {
    matchIndex = i + match.index;
    matchLength = match[0].length;
    return Math.max(score, scoreFuzzyMatch());
  } else {
    return score;
  }
}

function scoreFuzzyMatch() {
  // When the match is at the beginning of the string or preceded by a dot.
  if (matchIndex === 0 || value.charAt(matchIndex - 1) === SEPARATOR) {
    return Math.max(66, 100 - matchLength);
    // When the match is at the end of the string.
  } else if (matchIndex + matchLength === valueLength) {
    return Math.max(33, 67 - matchLength);
    // When the match is in the middle of the string.
  } else {
    return Math.max(1, 34 - matchLength);
  }
}

//
// Searchers
//

app.Searcher = class Searcher extends Events {
  static CHUNK_SIZE = 20000;

  static DEFAULTS = {
    max_results: app.config.max_results,
    fuzzy_min_length: 3,
  };

  static SEPARATORS_REGEXP =
    /#|::|:-|->|\$(?=\w)|\-(?=\w)|\:(?=\w)|\ [\/\-&]\ |:\ |\ /g;
  static EOS_SEPARATORS_REGEXP = /(\w)[\-:]$/;
  static INFO_PARANTHESES_REGEXP = /\ \(\w+?\)$/;
  static EMPTY_PARANTHESES_REGEXP = /\(\)/;
  static EVENT_REGEXP = /\ event$/;
  static DOT_REGEXP = /\.+/g;
  static WHITESPACE_REGEXP = /\s/g;

  static EMPTY_STRING = "";
  static ELLIPSIS = "...";
  static STRING = "string";

  static normalizeString(string) {
    return string
      .toLowerCase()
      .replace(Searcher.ELLIPSIS, Searcher.EMPTY_STRING)
      .replace(Searcher.EVENT_REGEXP, Searcher.EMPTY_STRING)
      .replace(Searcher.INFO_PARANTHESES_REGEXP, Searcher.EMPTY_STRING)
      .replace(Searcher.SEPARATORS_REGEXP, SEPARATOR)
      .replace(Searcher.DOT_REGEXP, SEPARATOR)
      .replace(Searcher.EMPTY_PARANTHESES_REGEXP, Searcher.EMPTY_STRING)
      .replace(Searcher.WHITESPACE_REGEXP, Searcher.EMPTY_STRING);
  }

  static normalizeQuery(string) {
    string = this.normalizeString(string);
    return string.replace(Searcher.EOS_SEPARATORS_REGEXP, "$1.");
  }

  constructor(options) {
    super();
    this.options = { ...Searcher.DEFAULTS, ...(options || {}) };
  }

  find(data, attr, q) {
    this.kill();

    this.data = data;
    this.attr = attr;
    this.query = q;
    this.setup();

    if (this.isValid()) {
      this.match();
    } else {
      this.end();
    }
  }

  setup() {
    query = this.query = this.constructor.normalizeQuery(this.query);
    queryLength = query.length;
    this.dataLength = this.data.length;
    this.matchers = [exactMatch];
    this.totalResults = 0;
    this.setupFuzzy();
  }

  setupFuzzy() {
    if (queryLength >= this.options.fuzzy_min_length) {
      fuzzyRegexp = this.queryToFuzzyRegexp(query);
      this.matchers.push(fuzzyMatch);
    } else {
      fuzzyRegexp = null;
    }
  }

  isValid() {
    return queryLength > 0 && query !== SEPARATOR;
  }

  end() {
    if (!this.totalResults) {
      this.triggerResults([]);
    }
    this.trigger("end");
    this.free();
  }

  kill() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.free();
    }
  }

  free() {
    this.data = null;
    this.attr = null;
    this.dataLength = null;
    this.matchers = null;
    this.matcher = null;
    this.query = null;
    this.totalResults = null;
    this.scoreMap = null;
    this.cursor = null;
    this.timeout = null;
  }

  match() {
    if (!this.foundEnough() && (this.matcher = this.matchers.shift())) {
      this.setupMatcher();
      this.matchChunks();
    } else {
      this.end();
    }
  }

  setupMatcher() {
    this.cursor = 0;
    this.scoreMap = new Array(101);
  }

  matchChunks() {
    this.matchChunk();

    if (this.cursor === this.dataLength || this.scoredEnough()) {
      this.delay(() => this.match());
      this.sendResults();
    } else {
      this.delay(() => this.matchChunks());
    }
  }

  matchChunk() {
    ({ matcher } = this);
    for (let j = 0, end = this.chunkSize(); j < end; j++) {
      value = this.data[this.cursor][this.attr];
      if (value.split) {
        // string
        valueLength = value.length;
        if ((score = matcher())) {
          this.addResult(this.data[this.cursor], score);
        }
      } else {
        // array
        score = 0;
        for (value of Array.from(this.data[this.cursor][this.attr])) {
          valueLength = value.length;
          score = Math.max(score, matcher() || 0);
        }
        if (score > 0) {
          this.addResult(this.data[this.cursor], score);
        }
      }
      this.cursor++;
    }
  }

  chunkSize() {
    if (this.cursor + Searcher.CHUNK_SIZE > this.dataLength) {
      return this.dataLength % Searcher.CHUNK_SIZE;
    } else {
      return Searcher.CHUNK_SIZE;
    }
  }

  scoredEnough() {
    return this.scoreMap[100]?.length >= this.options.max_results;
  }

  foundEnough() {
    return this.totalResults >= this.options.max_results;
  }

  addResult(object, score) {
    let name;
    (
      this.scoreMap[(name = Math.round(score))] || (this.scoreMap[name] = [])
    ).push(object);
    this.totalResults++;
  }

  getResults() {
    const results = [];
    for (let j = this.scoreMap.length - 1; j >= 0; j--) {
      var objects = this.scoreMap[j];
      if (objects) {
        results.push(...objects);
      }
    }
    return results.slice(0, this.options.max_results);
  }

  sendResults() {
    const results = this.getResults();
    if (results.length) {
      this.triggerResults(results);
    }
  }

  triggerResults(results) {
    this.trigger("results", results);
  }

  delay(fn) {
    return (this.timeout = setTimeout(fn, 1));
  }

  queryToFuzzyRegexp(string) {
    const chars = string.split("");
    for (i = 0; i < chars.length; i++) {
      var char = chars[i];
      chars[i] = $.escapeRegexp(char);
    }
    return new RegExp(chars.join(".*?")); // abc -> /a.*?b.*?c.*?/
  }
};

app.SynchronousSearcher = class SynchronousSearcher extends app.Searcher {
  match() {
    if (this.matcher) {
      if (!this.allResults) {
        this.allResults = [];
      }
      this.allResults.push(...this.getResults());
    }
    return super.match(...arguments);
  }

  free() {
    this.allResults = null;
    return super.free(...arguments);
  }

  end() {
    this.sendResults(true);
    return super.end(...arguments);
  }

  sendResults(end) {
    if (end && this.allResults?.length) {
      return this.triggerResults(this.allResults);
    }
  }

  delay(fn) {
    return fn();
  }
};
app.Shortcuts = class Shortcuts extends Events {
  constructor() {
    super();
    this.onKeydown = this.onKeydown.bind(this);
    this.onKeypress = this.onKeypress.bind(this);
    this.isMac = $.isMac();
    this.start();
  }

  start() {
    $.on(document, "keydown", this.onKeydown);
    $.on(document, "keypress", this.onKeypress);
  }

  stop() {
    $.off(document, "keydown", this.onKeydown);
    $.off(document, "keypress", this.onKeypress);
  }

  swapArrowKeysBehavior() {
    return app.settings.get("arrowScroll");
  }

  spaceScroll() {
    return app.settings.get("spaceScroll");
  }

  showTip() {
    app.showTip("KeyNav");
    return (this.showTip = null);
  }

  spaceTimeout() {
    return app.settings.get("spaceTimeout");
  }

  onKeydown(event) {
    if (this.buggyEvent(event)) {
      return;
    }
    const result = (() => {
      if (event.ctrlKey || event.metaKey) {
        if (!event.altKey && !event.shiftKey) {
          return this.handleKeydownSuperEvent(event);
        }
      } else if (event.shiftKey) {
        if (!event.altKey) {
          return this.handleKeydownShiftEvent(event);
        }
      } else if (event.altKey) {
        return this.handleKeydownAltEvent(event);
      } else {
        return this.handleKeydownEvent(event);
      }
    })();

    if (result === false) {
      event.preventDefault();
    }
  }

  onKeypress(event) {
    if (
      this.buggyEvent(event) ||
      (event.charCode === 63 && document.activeElement.tagName === "INPUT")
    ) {
      return;
    }
    if (!event.ctrlKey && !event.metaKey) {
      const result = this.handleKeypressEvent(event);
      if (result === false) {
        event.preventDefault();
      }
    }
  }

  handleKeydownEvent(event, _force) {
    if (
      !_force &&
      [37, 38, 39, 40].includes(event.which) &&
      this.swapArrowKeysBehavior()
    ) {
      return this.handleKeydownAltEvent(event, true);
    }

    if (
      !event.target.form &&
      ((48 <= event.which && event.which <= 57) ||
        (65 <= event.which && event.which <= 90))
    ) {
      this.trigger("typing");
      return;
    }

    switch (event.which) {
      case 8:
        if (!event.target.form) {
          return this.trigger("typing");
        }
        break;
      case 13:
        return this.trigger("enter");
      case 27:
        this.trigger("escape");
        return false;
      case 32:
        if (
          event.target.type === "search" &&
          this.spaceScroll() &&
          (!this.lastKeypress ||
            this.lastKeypress < Date.now() - this.spaceTimeout() * 1000)
        ) {
          this.trigger("pageDown");
          return false;
        }
        break;
      case 33:
        return this.trigger("pageUp");
      case 34:
        return this.trigger("pageDown");
      case 35:
        if (!event.target.form) {
          return this.trigger("pageBottom");
        }
        break;
      case 36:
        if (!event.target.form) {
          return this.trigger("pageTop");
        }
        break;
      case 37:
        if (!event.target.value) {
          return this.trigger("left");
        }
        break;
      case 38:
        this.trigger("up");
        if (typeof this.showTip === "function") {
          this.showTip();
        }
        return false;
      case 39:
        if (!event.target.value) {
          return this.trigger("right");
        }
        break;
      case 40:
        this.trigger("down");
        if (typeof this.showTip === "function") {
          this.showTip();
        }
        return false;
      case 191:
        if (!event.target.form) {
          this.trigger("typing");
          return false;
        }
        break;
    }
  }

  handleKeydownSuperEvent(event) {
    switch (event.which) {
      case 13:
        return this.trigger("superEnter");
      case 37:
        if (this.isMac) {
          this.trigger("superLeft");
          return false;
        }
        break;
      case 38:
        this.trigger("pageTop");
        return false;
      case 39:
        if (this.isMac) {
          this.trigger("superRight");
          return false;
        }
        break;
      case 40:
        this.trigger("pageBottom");
        return false;
      case 188:
        this.trigger("preferences");
        return false;
    }
  }

  handleKeydownShiftEvent(event, _force) {
    if (
      !_force &&
      [37, 38, 39, 40].includes(event.which) &&
      this.swapArrowKeysBehavior()
    ) {
      return this.handleKeydownEvent(event, true);
    }

    if (!event.target.form && 65 <= event.which && event.which <= 90) {
      this.trigger("typing");
      return;
    }

    switch (event.which) {
      case 32:
        this.trigger("pageUp");
        return false;
      case 38:
        if (!getSelection()?.toString()) {
          this.trigger("altUp");
          return false;
        }
        break;
      case 40:
        if (!getSelection()?.toString()) {
          this.trigger("altDown");
          return false;
        }
        break;
    }
  }

  handleKeydownAltEvent(event, _force) {
    if (
      !_force &&
      [37, 38, 39, 40].includes(event.which) &&
      this.swapArrowKeysBehavior()
    ) {
      return this.handleKeydownEvent(event, true);
    }

    switch (event.which) {
      case 9:
        return this.trigger("altRight", event);
      case 37:
        if (!this.isMac) {
          this.trigger("superLeft");
          return false;
        }
        break;
      case 38:
        this.trigger("altUp");
        return false;
      case 39:
        if (!this.isMac) {
          this.trigger("superRight");
          return false;
        }
        break;
      case 40:
        this.trigger("altDown");
        return false;
      case 67:
        this.trigger("altC");
        return false;
      case 68:
        this.trigger("altD");
        return false;
      case 70:
        return this.trigger("altF", event);
      case 71:
        this.trigger("altG");
        return false;
      case 79:
        this.trigger("altO");
        return false;
      case 82:
        this.trigger("altR");
        return false;
      case 83:
        this.trigger("altS");
        return false;
    }
  }

  handleKeypressEvent(event) {
    if (event.which === 63 && !event.target.value) {
      this.trigger("help");
      return false;
    } else {
      return (this.lastKeypress = Date.now());
    }
  }

  buggyEvent(event) {
    try {
      event.target;
      event.ctrlKey;
      event.which;
      return false;
    } catch (error) {
      return true;
    }
  }
};
app.Collection = class Collection {
  constructor(objects) {
    if (objects == null) {
      objects = [];
    }
    this.reset(objects);
  }

  model() {
    return app.models[this.constructor.model];
  }

  reset(objects) {
    if (objects == null) {
      objects = [];
    }
    this.models = [];
    for (var object of objects) {
      this.add(object);
    }
  }

  add(object) {
    if (object instanceof app.Model) {
      this.models.push(object);
    } else if (object instanceof Array) {
      for (var obj of object) {
        this.add(obj);
      }
    } else if (object instanceof app.Collection) {
      this.models.push(...(object.all() || []));
    } else {
      this.models.push(new (this.model())(object));
    }
  }

  remove(model) {
    this.models.splice(this.models.indexOf(model), 1);
  }

  size() {
    return this.models.length;
  }

  isEmpty() {
    return this.models.length === 0;
  }

  each(fn) {
    for (var model of this.models) {
      fn(model);
    }
  }

  all() {
    return this.models;
  }

  contains(model) {
    return this.models.includes(model);
  }

  findBy(attr, value) {
    return this.models.find((model) => model[attr] === value);
  }

  findAllBy(attr, value) {
    return this.models.filter((model) => model[attr] === value);
  }

  countAllBy(attr, value) {
    let i = 0;
    for (var model of this.models) {
      if (model[attr] === value) {
        i += 1;
      }
    }
    return i;
  }
};
app.collections.Docs = class Docs extends app.Collection {
  static model = "Doc";
  static NORMALIZE_VERSION_RGX = /\.(\d)$/;
  static NORMALIZE_VERSION_SUB = ".0$1";

  // Load models concurrently.
  // It's not pretty but I didn't want to import a promise library only for this.
  static CONCURRENCY = 3;

  findBySlug(slug) {
    return (
      this.findBy("slug", slug) || this.findBy("slug_without_version", slug)
    );
  }
  sort() {
    return this.models.sort((a, b) => {
      if (a.name === b.name) {
        if (
          !a.version ||
          a.version.replace(
            Docs.NORMALIZE_VERSION_RGX,
            Docs.NORMALIZE_VERSION_SUB,
          ) >
            b.version.replace(
              Docs.NORMALIZE_VERSION_RGX,
              Docs.NORMALIZE_VERSION_SUB,
            )
        ) {
          return -1;
        } else {
          return 1;
        }
      } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1;
      } else {
        return -1;
      }
    });
  }
  load(onComplete, onError, options) {
    let i = 0;

    var next = () => {
      if (i < this.models.length) {
        this.models[i].load(next, fail, options);
      } else if (i === this.models.length + Docs.CONCURRENCY - 1) {
        onComplete();
      }
      i++;
    };

    var fail = function (...args) {
      if (onError) {
        onError(args);
        onError = null;
      }
      next();
    };

    for (let j = 0, end = Docs.CONCURRENCY; j < end; j++) {
      next();
    }
  }

  clearCache() {
    for (var doc of this.models) {
      doc.clearCache();
    }
  }

  uninstall(callback) {
    let i = 0;
    var next = () => {
      if (i < this.models.length) {
        this.models[i++].uninstall(next, next);
      } else {
        callback();
      }
    };
    next();
  }

  getInstallStatuses(callback) {
    app.db.versions(this.models, (statuses) => {
      if (statuses) {
        for (var key in statuses) {
          var value = statuses[key];
          statuses[key] = { installed: !!value, mtime: value };
        }
      }
      callback(statuses);
    });
  }

  checkForUpdates(callback) {
    this.getInstallStatuses((statuses) => {
      let i = 0;
      if (statuses) {
        for (var slug in statuses) {
          var status = statuses[slug];
          if (this.findBy("slug", slug).isOutdated(status)) {
            i += 1;
          }
        }
      }
      callback(i);
    });
  }

  updateInBackground() {
    this.getInstallStatuses((statuses) => {
      if (!statuses) {
        return;
      }
      for (var slug in statuses) {
        var status = statuses[slug];
        var doc = this.findBy("slug", slug);
        if (doc.isOutdated(status)) {
          doc.install($.noop, $.noop);
        }
      }
    });
  }
};
app.collections.Entries = class Entries extends app.Collection {
  static model = "Entry";
};
app.collections.Types = class Types extends app.Collection {
  static model = "Type";
  static GUIDES_RGX =
    /(^|\()(guides?|tutorials?|reference|book|getting\ started|manual|examples)($|[\):])/i;
  static APPENDIX_RGX = /appendix/i;

  groups() {
    const result = [];
    for (var type of this.models) {
      const name = this._groupFor(type);
      result[name] ||= [];
      result[name].push(type);
    }
    return result.filter((e) => e.length > 0);
  }

  _groupFor(type) {
    if (Types.GUIDES_RGX.test(type.name)) {
      return 0;
    } else if (Types.APPENDIX_RGX.test(type.name)) {
      return 2;
    } else {
      return 1;
    }
  }
};
app.Model = class Model {
  constructor(attributes) {
    for (var key in attributes) {
      var value = attributes[key];
      this[key] = value;
    }
  }
};
app.models.Doc = class Doc extends app.Model {
  // Attributes: name, slug, type, version, release, db_size, mtime, links

  constructor() {
    super(...arguments);
    this.reset(this);
    this.slug_without_version = this.slug.split("~")[0];
    this.fullName = `${this.name}` + (this.version ? ` ${this.version}` : "");
    this.icon = this.slug_without_version;
    if (this.version) {
      this.short_version = this.version.split(" ")[0];
    }
    this.text = this.toEntry().text;
  }

  reset(data) {
    this.resetEntries(data.entries);
    this.resetTypes(data.types);
  }

  resetEntries(entries) {
    this.entries = new app.collections.Entries(entries);
    this.entries.each((entry) => {
      return (entry.doc = this);
    });
  }

  resetTypes(types) {
    this.types = new app.collections.Types(types);
    this.types.each((type) => {
      return (type.doc = this);
    });
  }

  fullPath(path) {
    if (path == null) {
      path = "";
    }
    if (path === "javascript:;") {
      return path;
    } else {
      if (path[0] !== "/") {
        path = `/${path}`;
      }
      return `/${this.slug}${path}`;
    }
  }
  fileUrl(path) {
    return `${app.config.docs_origin}${this.fullPath(path)}?${this.mtime}`;
  }

  dbUrl() {
    return `${app.config.docs_origin}/${this.slug}/${app.config.db_filename}?${this.mtime}`;
  }

  indexUrl() {
    return `${app.indexHost()}/${this.slug}/${app.config.index_filename}?${this.mtime}`;
  }

  toEntry() {
    if (this.entry) {
      return this.entry;
    }
    this.entry = new app.models.Entry({
      doc: this,
      name: this.fullName,
      path: "/",
    });
    if (this.version) {
      this.entry.addAlias(this.name);
    }
    return this.entry;
  }

  findEntryByPathAndHash(path, hash) {
    let entry;
    if (hash && (entry = this.entries.findBy("path", `${path}#${hash}`))) {
      return entry;
    } else if (path === "/") {
      return this.toEntry();
    } else {
      return this.entries.findBy("path", path);
    }
  }

  load(onSuccess, onError, options) {
    if (options == null) {
      options = {};
    }
    if (options.readCache && this._loadFromCache(onSuccess)) {
      return;
    }

    const callback = (data) => {
      this.reset(data);
      onSuccess();
      if (options.writeCache) {
        this._setCache(data);
      }
    };

    return ajax({
      url: this.indexUrl(),
      success: callback,
      error: onError,
    });
  }

  clearCache() {
    app.localStorage.del(this.slug);
  }

  _loadFromCache(onSuccess) {
    let data;
    if (!(data = this._getCache())) {
      return;
    }

    const callback = () => {
      this.reset(data);
      onSuccess();
    };

    setTimeout(callback, 0);
    return true;
  }

  _getCache() {
    let data;
    if (!(data = app.localStorage.get(this.slug))) {
      return;
    }

    if (data[0] === this.mtime) {
      return data[1];
    } else {
      this.clearCache();
      return;
    }
  }

  _setCache(data) {
    app.localStorage.set(this.slug, [this.mtime, data]);
  }

  install(onSuccess, onError, onProgress) {
    if (this.installing) {
      return;
    }
    this.installing = true;

    const error = () => {
      this.installing = null;
      onError();
    };

    const success = (data) => {
      this.installing = null;
      app.db.store(this, data, onSuccess, error);
    };

    ajax({
      url: this.dbUrl(),
      success,
      error,
      progress: onProgress,
      timeout: 3600,
    });
  }

  uninstall(onSuccess, onError) {
    if (this.installing) {
      return;
    }
    this.installing = true;

    const success = () => {
      this.installing = null;
      onSuccess();
    };

    const error = () => {
      this.installing = null;
      onError();
    };

    app.db.unstore(this, success, error);
  }

  getInstallStatus(callback) {
    app.db.version(this, (value) =>
      callback({ installed: !!value, mtime: value }),
    );
  }

  isOutdated(status) {
    if (!status) {
      return false;
    }
    const isInstalled = status.installed || app.settings.get("autoInstall");
    return isInstalled && this.mtime !== status.mtime;
  }
};

app.models.Entry = class Entry extends app.Model {
  static applyAliases(string) {
    const aliases = app.config.docs_aliases;
    if (aliases.hasOwnProperty(string)) {
      return [string, aliases[string]];
    } else {
      const words = string.split(".");
      for (let i = 0; i < words.length; i++) {
        var word = words[i];
        if (aliases.hasOwnProperty(word)) {
          words[i] = aliases[word];
          return [string, words.join(".")];
        }
      }
    }
    return string;
  }

  // Attributes: name, type, path
  constructor() {
    super(...arguments);
    this.text = Entry.applyAliases(app.Searcher.normalizeString(this.name));
  }

  addAlias(name) {
    const text = Entry.applyAliases(app.Searcher.normalizeString(name));
    if (!Array.isArray(this.text)) {
      this.text = [this.text];
    }
    this.text.push(Array.isArray(text) ? text[1] : text);
  }

    fullPath() {
      return this.doc.fullPath(this.isIndex() ? "" : this.path);
    }

    dbPath() {
      return this.path.replace(/#.*/, "");
    }

    filePath() {
      return this.doc.fullPath(this._filePath());
    }

    fileUrl() {
      return this.doc.fileUrl(this._filePath());
    }

    _filePath() {
      let result = this.path.replace(/#.*/, "");
      if (result.slice(-5) !== ".html") {
        result += ".html";
      }
      return result;
    }

    isIndex() {
      return this.path === "/";
    }

    getType() {
      return this.doc.types.findBy("name", this.type);
    }

  loadFile(onSuccess, onError) {
    return app.db.load(this, onSuccess, onError);
  }
};
app.models.Type = class Type extends app.Model {
  // Attributes: name, slug, count

  fullPath() {
    return "javascript:;";
  }
  // "/#{@doc.slug}-#{@slug}/"

  entries() {
    return this.doc.entries.findAllBy("type", this.name);
  }

  toEntry() {
    return new app.models.Entry({
      doc: this.doc,
      name: `${this.doc.name} / ${this.name}`,
      path: this.fullPath(),
    });
  }
};
// path: '..' + @fullPath();
app.View = class View extends Events {
  constructor(el) {
    super();
    if (el instanceof HTMLElement) {
      this.el = el;
    }
    this.setupElement();
    if (this.el.className) {
      this.originalClassName = this.el.className;
    }
    if (this.constructor.className) {
      this.resetClass();
    }
    this.refreshElements();
    if (typeof this.init === "function") {
      this.init();
      this.refreshElements();
    }
  }

  setupElement() {
    if (this.el == null) {
      this.el =
        typeof this.constructor.el === "string"
          ? $(this.constructor.el)
          : this.constructor.el
            ? this.constructor.el
            : document.createElement(this.constructor.tagName || "div");
    }

    if (this.constructor.attributes) {
      for (var key in this.constructor.attributes) {
        var value = this.constructor.attributes[key];
        this.el.setAttribute(key, value);
      }
    }
  }

  refreshElements() {
    if (this.constructor.elements) {
      for (var name in this.constructor.elements) {
        var selector = this.constructor.elements[name];
        this[name] = this.find(selector);
      }
    }
  }

  addClass(name) {
    this.el.classList.add(name);
  }

  removeClass(name) {
    this.el.classList.remove(name);
  }

  toggleClass(name) {
    this.el.classList.toggle(name);
  }

  hasClass(name) {
    return this.el.classList.contains(name);
  }

  resetClass() {
    this.el.className = this.originalClassName || "";
    if (this.constructor.className) {
      for (var name of Array.from(this.constructor.className.split(" "))) {
        this.addClass(name);
      }
    }
  }

  find(selector) {
    return $(selector, this.el);
  }

  findAll(selector) {
    return $$(selector, this.el);
  }

  findByClass(name) {
    return this.findAllByClass(name)[0];
  }

  findLastByClass(name) {
    const all = this.findAllByClass(name)[0];
    return all[all.length - 1];
  }

  findAllByClass(name) {
    return this.el.getElementsByClassName(name);
  }

  findByTag(tag) {
    return this.findAllByTag(tag)[0];
  }

  findLastByTag(tag) {
    const all = this.findAllByTag(tag);
    return all[all.length - 1];
  }

  findAllByTag(tag) {
    return this.el.getElementsByTagName(tag);
  }

  append(value) {
    $.append(this.el, value.el || value);
  }

  appendTo(value) {
    $.append(value.el || value, this.el);
  }

  prepend(value) {
    $.prepend(this.el, value.el || value);
  }

  prependTo(value) {
    $.prepend(value.el || value, this.el);
  }

  before(value) {
    $.before(this.el, value.el || value);
  }

  after(value) {
    $.after(this.el, value.el || value);
  }

  remove(value) {
    $.remove(value.el || value);
  }

  empty() {
    $.empty(this.el);
    this.refreshElements();
  }

  html(value) {
    this.empty();
    this.append(value);
  }
  // @w3cub
  inserthtml(el, value) {
    $.empty(el);
    this.refreshElements();
    $.append(el, value.el || value);
  }

  tmpl(...args) {
    return app.templates.render(...args);
  }

  delay(fn, ...args) {
    const delay = typeof args[args.length - 1] === "number" ? args.pop() : 0;
    return setTimeout(fn.bind(this, ...args), delay);
  }

  onDOM(event, callback) {
    $.on(this.el, event, callback);
  }

  offDOM(event, callback) {
    $.off(this.el, event, callback);
  }

  bindEvents() {
    let method, name;
    if (this.constructor.events) {
      for (name in this.constructor.events) {
        method = this.constructor.events[name];
        this[method] = this[method].bind(this);
        this.onDOM(name, this[method]);
      }
    }

    if (this.constructor.routes) {
      for (name in this.constructor.routes) {
        method = this.constructor.routes[name];
        this[method] = this[method].bind(this);
        app.router.on(name, this[method]);
      }
    }

    if (this.constructor.shortcuts) {
      for (name in this.constructor.shortcuts) {
        method = this.constructor.shortcuts[name];
        this[method] = this[method].bind(this);
        app.shortcuts.on(name, this[method]);
      }
    }
  }

  unbindEvents() {
    let method, name;
    if (this.constructor.events) {
      for (name in this.constructor.events) {
        method = this.constructor.events[name];
        this.offDOM(name, this[method]);
      }
    }

    if (this.constructor.routes) {
      for (name in this.constructor.routes) {
        method = this.constructor.routes[name];
        app.router.off(name, this[method]);
      }
    }

    if (this.constructor.shortcuts) {
      for (name in this.constructor.shortcuts) {
        method = this.constructor.shortcuts[name];
        app.shortcuts.off(name, this[method]);
      }
    }
  }

  addSubview(view) {
    return (this.subviews || (this.subviews = [])).push(view);
  }

  activate() {
    if (this.activated) {
      return;
    }
    this.bindEvents();
    if (this.subviews) {
      for (var view of Array.from(this.subviews)) {
        view.activate();
      }
    }
    this.activated = true;
    return true;
  }

  deactivate() {
    if (!this.activated) {
      return;
    }
    this.unbindEvents();
    if (this.subviews) {
      for (var view of Array.from(this.subviews)) {
        view.deactivate();
      }
    }
    this.activated = false;
    return true;
  }

  detach() {
    this.deactivate();
    $.remove(this.el);
  }
};

  // Lazyload Component
  app.views.Lazyload = class Lazyload extends app.View {
    static SENCER = 30;

    static el = "._list";

    static elements = {
      items: "._list-item",
    };

    constructor(el, opts) {
      super(el);
      this.tag = "data-src";
      this.distance = 0;
      this.callback = $.noop;
      this._pause = false;

      // mixin
      var opts = opts || {};
      for (var key in opts) {
        this[key] = opts[key];
      }
    }
    init() {
      this.activate();
    }
    activate() {
      if (super.activate(...arguments)) {
        this._detectElementIfInScreen();

        this._onScroll = () => {
          this._timer && clearTimeout(this._timer);
          this._timer = setTimeout(() => {
            this._detectElementIfInScreen();
          }, Lazyload.SENCER);
        };

        this._onResize = () => {
          this._timer && clearTimeout(this._timer);
          this._detectElementIfInScreen();
        };

        $.on(window, "scroll", this._onScroll);
        $.on(window, "resize", this._onResize);
      }
    }
    deactivate() {
      if (super.deactivate(...arguments)) {
        $.off(window, "scroll", this._onScroll);
        $.off(window, "resize", this._onResize);
        this._timer && clearTimeout(this._timer);
      }
    }

    // detect if in screen
    _detectElementIfInScreen() {
      if (!this.items?.length || this._pause) return;

      var W = window.innerWidth || document.documentElement.clientWidth;
      var H = window.innerHeight || document.documentElement.clientHeight;

      for (var i = 0, len = this.items.length; i < len; i++) {
        var ele = this.items[i];
        var rect = ele.getBoundingClientRect();
        if (
          ((rect.top >= this.distance && rect.left >= this.distance) ||
            (rect.top < 0 && rect.top + rect.height >= this.distance) ||
            (rect.left < 0 && rect.left + rect.width >= this.distance)) &&
          rect.top <= H &&
          rect.left <= W
        ) {
          this.loadItem(ele);
          this.items.splice(i, 1);
          i--;
          len--;
        }
      }

      if (!this.items.length) {
        this.callback && this.callback();
      }
    }

    pause() {
      this._pause = true;
      return this;
    }

    restart() {
      this._pause = false;
      this._detectElementIfInScreen();
      return this;
    }

    // lazyload img or script
    loadItem(ele) {
      var imgs = ele.getitemsByTagName("img");
      for (var i = 0, len = imgs.length; i < len; i++) {
        var img = imgs[i];
        var src = img.getAttribute(this.tag);
        if (src) {
          img.setAttribute("src", src);
        }
      }
    }
  };
 
app.views.Document = class Document extends app.View {
  static el = document;

  static events = { visibilitychange: "onVisibilityChange" };

  static shortcuts = {
    help: "onHelp",
    preferences: "onPreferences",
    escape: "onEscape",
    superLeft: "onBack",
    superRight: "onForward",
  };

  static routes = { after: "afterRoute" };

  init() {

    // this.menu = new app.views.Menu();
    this.sidebar = new app.views.Sidebar();
    this.addSubview(this.sidebar);
    // this.addSubview(this.menu, this.addSubview(this.sidebar));
    // if (app.views.Resizer.isSupported()) {
    //   this.resizer = new app.views.Resizer();
    //   this.addSubview(this.resizer);
    // }
    this.content = new app.views.Content();
    this.addSubview(this.content);

    if (!app.isSingleDoc() && !app.isMobile()) {
      this.path = new app.views.Path();
      this.addSubview(this.path);
    }
    // if (!app.isSingleDoc()) {
    //   this.settings = new app.views.Settings();
    // }
    this.totop = new app.views.ToTopView();
    
    this.addSubview(this.totop);
      

    $.on(document.body, "click", this.onClick);

    this.activate();
  }

  setTitle(title) {
    return (this.el.title = title
      ? `${title} — DevDocs`
      : "DevDocs API Documentation");
  }

  afterRoute(route) {
    if (route === "settings") {
      if (this.settings != null) {
        this.settings.activate();
      }
    } else {
      if (this.settings != null) {
        this.settings.deactivate();
      }
    }
  }

  onVisibilityChange() {
    if (this.el.visibilityState !== "visible") {
      return;
    }
    this.delay(() => {
      if (app.isMobile() !== app.views.Mobile.detect()) {
        location.reload();
      }
    }, 300);
  }

  onHelp() {
    app.router.show("/help#shortcuts");
  }

  onPreferences() {
    app.router.show("/settings");
  }

  onEscape() {
    const path =
      !app.isSingleDoc() || location.pathname === app.doc.fullPath()
        ? "/"
        : app.doc.fullPath();

    app.router.show(path);
  }

  onBack() {
    history.back();
  }

  onForward() {
    history.forward();
  }

  onClick(event) {
    const target = $.eventTarget(event);
    if (!target.hasAttribute("data-behavior")) {
      return;
    }
    $.stopEvent(event);
    switch (target.getAttribute("data-behavior")) {
      case "back":
        history.back();
        break;
      case "reload":
        window.location.reload();
        break;
      case "reboot":
        app.reboot();
        break;
      case "hard-reload":
        app.reload();
        break;
      case "reset":
        if (confirm("Are you sure you want to reset DevDocs?")) {
          app.reset();
        }
        break;
      case "accept-analytics":
        Cookies.set("analyticsConsent", "1", { expires: 1e8 }) && app.reboot();
        break;
      case "decline-analytics":
        Cookies.set("analyticsConsent", "0", { expires: 1e8 }) && app.reboot();
        break;
    }
  }
};
app.views.Menu = class Menu extends app.View {
  static el = "._menu";
  static activeClass = "active";

  static events = { click: "onClick" };

  init() {
    $.on(document.body, "click", (event) => this.onGlobalClick(event));
  }

  onClick(event) {
    const target = $.eventTarget(event);
    if (target.tagName === "A") {
      target.blur();
    }
  }

  onGlobalClick(event) {
    if (event.which !== 1) {
      return;
    }
    if (
      typeof event.target.hasAttribute === "function"
        ? event.target.hasAttribute("data-toggle-menu")
        : undefined
    ) {
      this.toggleClass(this.constructor.activeClass);
    } else if (this.hasClass(this.constructor.activeClass)) {
      this.removeClass(this.constructor.activeClass);
    }
  }
};
app.views.Mobile = class Mobile extends app.View {
  static el = document.documentElement;

  static elements = {
    body: "body",
    content: "._container",
    sidebar: "._sidebar",
    docPicker: "._settings ._sidebar",
  };

  static shortcuts = { escape: "onEscape" };

  static routes = { after: "afterRoute" };

  static detect() {
    if (Cookies.get("override-mobile-detect") != null) {
      return JSON.parse(Cookies.get("override-mobile-detect"));
    }
    try {
      return (
        window.matchMedia("(max-width: 480px)").matches ||
        window.matchMedia("(max-width: 767px)").matches ||
        window.matchMedia("(max-height: 767px) and (max-width: 1024px)")
          .matches ||
        // Need to sniff the user agent because some Android and Windows Phone devices don't take
        // resolution (dpi) into account when reporting device width/height.
        (navigator.userAgent.includes("Android") &&
          navigator.userAgent.includes("Mobile")) ||
        navigator.userAgent.includes("IEMobile")
      );
    } catch (error) {
      return false;
    }
  }

  static detectAndroidWebview() {
    try {
      return /(Android).*( Version\/.\.. ).*(Chrome)/.test(navigator.userAgent);
    } catch (error) {
      return false;
    }
  }

  _getVendorPrefix() {
    const regex = /^(Webkit|Khtml|Moz|ms|O)(?=[A-Z])/;
    const styleDeclaration = document.getElementsByTagName('script')[0].style;
    for (const prop in styleDeclaration) {
      if (regex.test(prop)) {
        return '-' + prop.match(regex)[0].toLowerCase() + '-';
      }
    }
    // Nothing found so far? Webkit does not enumerate over the CSS properties of the style object.
    // However (prop in style) returns the correct value, so we'll have to test for
    // the precence of a specific property
    if ('WebkitOpacity' in styleDeclaration) {
      return '-webkit-';
    }
    if ('KhtmlOpacity' in styleDeclaration) {
      return '-khtml-';
    }
    return '';
  }

  init() {
    if ($.isTouchScreen()) {
      FastClick.attach(this.body);
      app.shortcuts.stop();
    }

    this.panel = $("._container");
    this.panelContent = $("._content");
    this.sidebar = $("._sidebar");
    this.header = $("._header");

    this._initTouchEvents();
    this._initEventListeners();

    this.activate();
  }

  _initTouchEvents() {
    const doc = window.document;
    const html = this.el;
    const msPointerSupported = window.navigator.msPointerEnabled;
    const touch = {
      start: msPointerSupported ? 'MSPointerDown' : 'touchstart',
      move: msPointerSupported ? 'MSPointerMove' : 'touchmove',
      end: msPointerSupported ? 'MSPointerUp' : 'touchend'
    };

    this._prefix = this._getVendorPrefix();

    let scrollTimeout;
    let scrolling = false;


    this._onScrollFn = $.decouple(this.panelContent, 'scroll', () => {
      if (!this._moved) {
        clearTimeout(scrollTimeout);
        scrolling = true;
        scrollTimeout = setTimeout(() => {
          scrolling = false;
        }, 250);
      }
    });

    /**
     * Prevents touchmove event if slideout is moving
     */

    this._preventMove = (eve) => {
      if (this._moved) {
        eve.preventDefault();
      }
    };
    this.panel.addEventListener(touch.move, this._preventMove);

    /**
     * Resets values on touchstart
     */

    this._resetTouchFn = (eve) => {
      if (typeof eve.touches === 'undefined') {
        return;
      }
      this._moved = false;
      this._opening = false;
      this._startOffsetX = eve.touches[0].clientX;
      this._startOffsetY = eve.touches[0].clientY;
      this._preventOpen = !this._touch || (!this.isSidebarShown() && (this.sidebar.clientWidth !== 0));
    };

    this.panel.addEventListener(touch.start, this._resetTouchFn);


    /**
     * Resets values on touchcancel
     */

    this._onTouchCancelFn = () => {
      this._moved = false;
      this._opening = false;
    };

    this.panel.addEventListener('touchcancel', this._onTouchCancelFn);

    /**
     * Toggles slideout on touchend
     */

    this._onTouchEndFn = () => {
      if (this._moved) {
        if (this._opening && (Math.abs(this._currentOffsetX / this._currentOffsetY) > this._ratio) && (Math.abs(this._currentOffsetX) > this._tolerance)) {
          this.showSidebar();
        } else {
          this.hideSidebar();
        }
      }
      this._moved = false;
    };

    this.panel.addEventListener(touch.end, this._onTouchEndFn);

    /**
     * Translates panel on touchmove
     */

    this._onTouchMoveFn = (eve) => {
      if (scrolling || this._preventOpen || (typeof eve.touches === 'undefined')) {
        return;
      }
      const dif_x = eve.touches[0].clientX - this._startOffsetX;
      const dif_y = eve.touches[0].clientY - this._startOffsetY;
      let translateX = (this._currentOffsetX = dif_x);
      const translateY = (this._currentOffsetY = dif_y);
      if (Math.abs(translateX) > this._padding) {
        return;
      }
      if ((Math.abs(dif_x) > 20) && (Math.abs(dif_x / dif_y) > this._ratio) && eve.cancelable) {
        this._opening = true;
        const oriented_dif_x = dif_x * this._orientation;
        if ((this._opened && (oriented_dif_x > 0)) || (!this._opened && (oriented_dif_x < 0))) {
          return;
        }
        if (oriented_dif_x <= 0) {
          translateX = dif_x + (this._padding * this._orientation);
          this._opening = false;
        }
        if (!this._moved && (html.className.search('_open-sidebar') === -1)) {
          html.className += ' _open-sidebar';
        }
        this.panel.style[this._prefix + 'transform'] = (this.panel.style.transform = 'translateX(' + translateX + 'px)');
        this.header.style[this._prefix + 'transform'] = (this.header.style.transform = 'translateX(' + translateX + 'px)');
        this._moved = true;
      }
    };

    this.panel.addEventListener(touch.move, this._onTouchMoveFn);
  }

  _initEventListeners() {
    $.on(this.body, 'click', this.onClick);
    $.on($('._menu-link'), 'click', this.onClickMenu);
    $.on($('._search'), 'touchend', this.onTapSearch);
  }
  _setTransition() {
    this.panel.style[this._prefix + 'transition'] = (this.panel.style.transition = this._prefix + 'transform ' + this._duration + 'ms ' + this._fx);
    this.header.style[this._prefix + 'transition'] = (this.header.style.transition = this._prefix + 'transform ' + this._duration + 'ms ' + this._fx);
  }
  _translateXTo(translateX) { 
    this._currentOffsetX = translateX;
    this._currentOffsetY = 0;
    this.panel.style[this._prefix + 'transform'] = (this.panel.style.transform = 'translateX(' + translateX + 'px)');
    this.header.style[this._prefix + 'transform'] = (this.header.style.transform = 'translateX(' + translateX + 'px)');
  }
  showSidebar() {
    let selection;
    if (this.isSidebarShown()) { return; }
    this.contentTop = this.body.scrollTop;
    this.addClass('_open-sidebar');

    this._setTransition();
    this._translateXTo(this._translateTo);
    this._opened = true;

    // @content.style.display = 'none'
    // @sidebar.style.display = 'block'

    if ((selection = this.findByClass(app.views.ListSelect.activeClass))) {
      $.scrollTo(selection, this.body, 'center');
    } else {
      this.body.scrollTop = (this.findByClass(app.views.ListFold.activeClass) && this.sidebarTop) || 0;
    }

    setTimeout(() => {
      this.panel.style.transition = (this.panel.style['-webkit-transition'] = (this.panel.style[this._prefix + 'transform'] = (this.panel.style.transform = '')));
      this.header.style.transition = (this.header.style['-webkit-transition'] = (this.header.style[this._prefix + 'transform'] = (this.header.style.transform = '')));
    }, this._duration + 50);
  }
  hideSidebar() {
    if (!this.isSidebarShown() && !this._opening) { return; }
    this.sidebarTop = this.body.scrollTop;
    

    this._setTransition();
    this._translateXTo(0);
    this._opened = false;

    // @sidebar.style.display = 'none'
    // @content.style.display = 'block'
    this.body.scrollTop = this.contentTop || 0;
    setTimeout(() => {
      this.removeClass('_open-sidebar');
      this.panel.style.transition = (this.panel.style['-webkit-transition'] = (this.panel.style[this._prefix + 'transform'] = (this.panel.style.transform = '')));
      this.header.style.transition = (this.header.style['-webkit-transition'] = (this.header.style[this._prefix + 'transform'] = (this.header.style.transform = '')));
    }, this._duration + 50);
  }

  isSidebarShown() {
    return this._opened;
  }
    // ~[].slice.call(@el.classList, 0).indexOf('_open-sidebar')
    // @sidebar.style.display isnt 'none'

  onClick(event) {
    if (event.target.hasAttribute('data-pick-docs')) {
      this.showSidebar();
    }
  }



  onClickMenu() {
    if (this.isSidebarShown()) { this.hideSidebar(); } else { this.showSidebar(); }
  }

  onTapSearch() {
    return this.body.scrollTop = 0;
  }
  
  onEscape() {
    return this.hideSidebar();
  }

  afterRoute() {
    this.hideSidebar();
  }
};
app.views.Nav = class Nav extends app.View {
  constructor(...args) {
    super(...args);
  }
  static el = '._nav';
  static activeClass = '_nav-current';

  static routes = {
    after: 'afterRoute'
  };

  select(href) {
    this.deselect();
    if (this.current = this.find(`a[href='${href}']`)) {
      this.current.classList.add(this.constructor.activeClass);
      this.current.setAttribute('tabindex', '-1');
    }
  }

  deselect() {
    if (this.current) {
      this.current.classList.remove(this.constructor.activeClass);
      this.current.removeAttribute('tabindex');
      this.current = null;
    }
  }

  afterRoute(route, context) {
    if (['page', 'offline'].includes(route)) {
      return this.select(context.pathname);
    } else {
      return this.deselect();
    }
  }
};
app.views.Path = class Path extends app.View {
  static className = "_path";
  static attributes = { role: "complementary" };

  static events = { click: "onClick" };

  static routes = { after: "afterRoute" };

  render(...args) {
    this.html(this.tmpl("path", ...args));
    this.show();
  }

  show() {
    if (!this.el.parentNode) {
      this.prependTo(app.el);
    }
  }

  hide() {
    if (this.el.parentNode) {
      $.remove(this.el);
    }
  }

  onClick(event) {
    const link = $.closestLink(event.target, this.el);
    if (link) {
      this.clicked = true;
    }
  }

  afterRoute(route, context) {
    if (context.type) {
      this.render(context.doc, context.type);
    } else if (context.entry) {
      if (context.entry.isIndex()) {
        this.render(context.doc);
      } else {
        this.render(context.doc, context.entry.getType(), context.entry);
      }
    } else {
      this.hide();
    }

    if (this.clicked) {
      this.clicked = null;
      app.document.sidebar.reset();
    }
  }
};
app.views.Resizer = class Resizer extends app.View {
  static className = "_resizer";

  static events = {
    dragstart: "onDragStart",
    dragend: "onDragEnd",
  };

  static MIN = 260;
  static MAX = 600;

  static isSupported() {
    return "ondragstart" in document.createElement("div") && !app.isMobile();
  }

  init() {
    this.el.setAttribute("draggable", "true");
    this.appendTo($("._app"));
  }

  resize(value, save) {
    value -= app.el.offsetLeft;
    if (!(value > 0)) {
      return;
    }
    value = Math.min(Math.max(Math.round(value), Resizer.MIN), Resizer.MAX);
    const newSize = `${value}px`;
    document.documentElement.style.setProperty("--sidebarWidth", newSize);
    if (save) {
      app.settings.setSize(value);
    }
  }

  onDragStart(event) {
    event.dataTransfer.effectAllowed = "link";
    event.dataTransfer.setData("Text", "");
    this.onDrag = this.onDrag.bind(this);
    $.on(window, "dragover", this.onDrag);
  }

  onDrag(event) {
    const value = event.pageX;
    if (!(value > 0)) {
      return;
    }
    this.lastDragValue = value;
    if (this.lastDrag && this.lastDrag > Date.now() - 50) {
      return;
    }
    this.lastDrag = Date.now();
    this.resize(value, false);
  }

  onDragEnd(event) {
    $.off(window, "dragover", this.onDrag);
    let value = event.pageX || event.screenX - window.screenX;
    if (
      this.lastDragValue &&
      !(this.lastDragValue - 5 < value && value < this.lastDragValue + 5)
    ) {
      // https://github.com/freeCodeCamp/devdocs/issues/265
      value = this.lastDragValue;
    }
    this.resize(value, true);
  }
};
app.views.BasePage = class BasePage extends app.View {
  constructor(el, entry) {
    super(el);
    this.entry = entry;
  }

  deactivate() {
    if (super.deactivate(...arguments)) {
      return (this.highlightNodes = []);
    }
  }

  render(content, fromCache) {
    if (fromCache == null) {
      fromCache = false;
    }
    this.highlightNodes = [];
    this.previousTiming = null;
    if (!this.constructor.className) {
      this.addClass(`_${this.entry.doc.type}`);
    }
    // this.html(content);
    // @w3cub
    if (!fromCache) {
      this.highlightCode();
    }
    this.activate();
    if (this.afterRender) {
      this.delay(this.afterRender);
    }
    if (this.highlightNodes.length > 0) {
      requestAnimationFrame(() => this.paintCode());
    }
  }

  highlightCode() {
    for (var el of this.findAll("pre[data-language]")) {
      var language = el.getAttribute("data-language");
      el.classList.add(`language-${language}`);
      this.highlightNodes.push(el);
    }
  }

  paintCode(timing) {
    if (this.previousTiming) {
      if (Math.round(1000 / (timing - this.previousTiming)) > 50) {
        // fps
        this.nodesPerFrame = Math.round(
          Math.min(this.nodesPerFrame * 1.25, 50),
        );
      } else {
        this.nodesPerFrame = Math.round(Math.max(this.nodesPerFrame * 0.8, 10));
      }
    } else {
      this.nodesPerFrame = 10;
    }

    for (var el of this.highlightNodes.splice(0, this.nodesPerFrame)) {
      const clipEl = el.lastElementChild;
      if (clipEl) {
        $.remove(clipEl);
      }
      Prism.highlightElement(el);
      if (clipEl) {
        $.append(el, clipEl);
      }
    }

    if (this.highlightNodes.length > 0) {
      requestAnimationFrame(() => this.paintCode());
    }
    this.previousTiming = timing;
  }
};
app.views.HiddenPage = class HiddenPage extends app.View {
  static events = { click: "onClick" };

  constructor(el, entry) {
    super(el);
    this.entry = entry;
  }

  init() {
    this.notice = new app.views.Notice("disabledDoc");
    this.addSubview(this.notice);
    this.activate();
  }

  onClick(event) {
    const link = $.closestLink(event.target, this.el);
    if (link) {
      $.stopEvent(event);
      $.popup(link);
    }
  }
};

app.views.JqueryPage = class JqueryPage extends app.views.BasePage {
  static demoClassName = "_jquery-demo";

  afterRender() {
    // Prevent jQuery Mobile's demo iframes from scrolling the page
    for (var iframe of this.findAllByTag("iframe")) {
      iframe.style.display = "none";
      this.onIframeLoaded = this.onIframeLoaded.bind(this);
      $.on(iframe, "load", this.onIframeLoaded);
    }

    return this.runExamples();
  }

  onIframeLoaded(event) {
    event.target.style.display = "";
    $.off(event.target, "load", this.onIframeLoaded);
  }

  runExamples() {
    for (var el of this.findAllByClass("entry-example")) {
      try {
        this.runExample(el);
      } catch (error) {}
    }
  }

  runExample(el) {
    const source = el.getElementsByClassName("syntaxhighlighter")[0];
    if (!source || source.innerHTML.indexOf("!doctype") === -1) {
      return;
    }

    let iframe = el.getElementsByClassName(JqueryPage.demoClassName)[0];
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.className = JqueryPage.demoClassName;
      iframe.width = "100%";
      iframe.height = 200;
      el.appendChild(iframe);
    }

    const doc = iframe.contentDocument;
    doc.write(this.fixIframeSource(source.textContent));
    doc.close();
  }

  fixIframeSource(source) {
    source = source.replace(
      '"/resources/',
      '"https://api.jquery.com/resources/',
    ); // attr(), keydown()
    source = source.replace(
      "</head>",
      `\
<style>
  html, body { border: 0; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
</style>
<script>
  $.ajaxPrefilter(function(opt, opt2, xhr) {
    if (opt.url.indexOf('http') !== 0) {
      xhr.abort();
      document.body.innerHTML = "<p><strong>This demo cannot run inside DevDocs.</strong></p>";
    }
  });
</script>
</head>\
`,
    );
    return source.replace(/<script>/gi, '<script nonce="devdocs">');
  }
};

app.views.RdocPage = class RdocPage extends app.views.BasePage {
  static events = { click: "onClick" };

  onClick(event) {
    if (!event.target.classList.contains("method-click-advice")) {
      return;
    }
    $.stopEvent(event);

    const source = $(
      ".method-source-code",
      event.target.closest(".method-detail"),
    );
    const isShown = source.style.display === "block";

    source.style.display = isShown ? "none" : "block";
    return (event.target.textContent = isShown ? "Show source" : "Hide source");
  }
};

app.views.SqlitePage = class SqlitePage extends app.views.BasePage {
  static events = { click: "onClick" };

  onClick(event) {
    const id = event.target.getAttribute("data-toggle");
    if (!id) {
      return;
    }
    const el = this.find(`#${id}`);
    if (!el) {
      return;
    }
    $.stopEvent(event);
    if (el.style.display === "none") {
      el.style.display = "block";
      event.target.textContent = "hide";
    } else {
      el.style.display = "none";
      event.target.textContent = "show";
    }
  }
};

app.views.SupportTablesPage = class SupportTablesPage extends (
  app.views.BasePage
) {
  static events = { click: "onClick" };

  onClick(event) {
    if (!event.target.classList.contains("show-all")) {
      return;
    }
    $.stopEvent(event);

    let el = event.target;
    while (el.tagName !== "TABLE") {
      el = el.parentNode;
    }
    el.classList.add("show-all");
  }
};
app.views.ListFocus = class ListFocus extends app.View {
  static activeClass = "focus";

  static events = { click: "onClick" };

  static shortcuts = {
    up: "onUp",
    down: "onDown",
    left: "onLeft",
    enter: "onEnter",
    superEnter: "onSuperEnter",
    escape: "blur",
  };

  constructor(el) {
    super(el);
    this.focusOnNextFrame = (el) => requestAnimationFrame(() => this.focus(el));
  }

  focus(el, options) {
    if (options == null) {
      options = {};
    }
    if (el && !el.classList.contains(this.constructor.activeClass)) {
      this.blur();
      el.classList.add(this.constructor.activeClass);
      if (options.silent !== true) {
        $.trigger(el, "focus");
      }
    }
  }

  blur() {
    const cursor = this.getCursor();
    if (cursor) {
      cursor.classList.remove(this.constructor.activeClass);
      $.trigger(cursor, "blur");
    }
  }

  getCursor() {
    return (
      this.findByClass(this.constructor.activeClass) ||
      this.findByClass(app.views.ListSelect.activeClass)
    );
  }

  findNext(cursor) {
    const next = cursor.nextSibling;
    if (next) {
      if (next.tagName === "A") {
        return next;
      } else if (next.tagName === "SPAN") {
        // pagination link
        $.click(next);
        return this.findNext(cursor);
      } else if (next.tagName === "DIV") {
        // sub-list
        if (cursor.className.includes(" open")) {
          return this.findFirst(next) || this.findNext(next);
        } else {
          return this.findNext(next);
        }
      } else if (next.tagName === "H6") {
        // title
        return this.findNext(next);
      }
    } else if (cursor.parentNode !== this.el) {
      return this.findNext(cursor.parentNode);
    }
  }

  findFirst(cursor) {
    const first = cursor.firstChild;
    if (!first) {
      return;
    }

    if (first.tagName === "A") {
      return first;
    } else if (first.tagName === "SPAN") {
      // pagination link
      $.click(first);
      return this.findFirst(cursor);
    }
  }

  findPrev(cursor) {
    const prev = cursor.previousSibling;
    if (prev) {
      if (prev.tagName === "A") {
        return prev;
      } else if (prev.tagName === "SPAN") {
        // pagination link
        $.click(prev);
        return this.findPrev(cursor);
      } else if (prev.tagName === "DIV") {
        // sub-list
        if (prev.previousSibling.className.includes("open")) {
          return this.findLast(prev) || this.findPrev(prev);
        } else {
          return this.findPrev(prev);
        }
      } else if (prev.tagName === "H6") {
        // title
        return this.findPrev(prev);
      }
    } else if (cursor.parentNode !== this.el) {
      return this.findPrev(cursor.parentNode);
    }
  }

  findLast(cursor) {
    const last = cursor.lastChild;
    if (!last) {
      return;
    }

    if (last.tagName === "A") {
      return last;
    } else if (last.tagName === "SPAN" || last.tagName === "H6") {
      // pagination link or title
      return this.findPrev(last);
    } else if (last.tagName === "DIV") {
      // sub-list
      return this.findLast(last);
    }
  }

  onDown() {
    const cursor = this.getCursor();
    if (cursor) {
      this.focusOnNextFrame(this.findNext(cursor));
    } else {
      this.focusOnNextFrame(this.findByTag("a"));
    }
  }

  onUp() {
    const cursor = this.getCursor();
    if (cursor) {
      this.focusOnNextFrame(this.findPrev(cursor));
    } else {
      this.focusOnNextFrame(this.findLastByTag("a"));
    }
  }

  onLeft() {
    const cursor = this.getCursor();
    if (
      cursor &&
      !cursor.classList.contains(app.views.ListFold.activeClass) &&
      cursor.parentNode !== this.el
    ) {
      const prev = cursor.parentNode.previousSibling;
      if (prev && prev.classList.contains(app.views.ListFold.targetClass)) {
        this.focusOnNextFrame(cursor.parentNode.previousSibling);
      }
    }
  }

  onEnter() {
    const cursor = this.getCursor();
    if (cursor) {
      $.click(cursor);
    }
  }

  onSuperEnter() {
    const cursor = this.getCursor();
    if (cursor) {
      $.popup(cursor);
    }
  }

  onClick(event) {
    if (event.which !== 1 || event.metaKey || event.ctrlKey) {
      return;
    }
    const target = $.eventTarget(event);
    if (target.tagName === "A") {
      this.focus(target, { silent: true });
    }
  }
};
app.views.ListFold = class ListFold extends app.View {
  static targetClass = "_list-dir";
  static handleClass = "_list-arrow";
  static activeClass = "open";

  static events = { click: "onClick" };

  static shortcuts = {
    left: "onLeft",
    right: "onRight",
  };

  open(el) {
    if (el && !el.classList.contains(this.constructor.activeClass)) {
      el.classList.add(this.constructor.activeClass);
      $.trigger(el, "open");
    }
  }

  close(el) {
    if (el && el.classList.contains(this.constructor.activeClass)) {
      el.classList.remove(this.constructor.activeClass);
      $.trigger(el, "close");
    }
  }

  toggle(el) {
    if (el.classList.contains(this.constructor.activeClass)) {
      this.close(el);
    } else {
      this.open(el);
    }
  }

  reset() {
    let el;
    while ((el = this.findByClass(this.constructor.activeClass))) {
      this.close(el);
    }
  }

  getCursor() {
    return (
      this.findByClass(app.views.ListFocus.activeClass) ||
      this.findByClass(app.views.ListSelect.activeClass)
    );
  }

  onLeft() {
    const cursor = this.getCursor();
    if (cursor?.classList?.contains(this.constructor.activeClass)) {
      this.close(cursor);
    }
  }

  onRight() {
    const cursor = this.getCursor();
    if (
      cursor != null
        ? cursor.classList.contains(this.constructor.targetClass)
        : undefined
    ) {
      this.open(cursor);
    }
  }

  onClick(event) {
    if (event.which !== 1 || event.metaKey || event.ctrlKey) {
      return;
    }
    if (!event.pageY) {
      return;
    } // ignore fabricated clicks
    let el = $.eventTarget(event);
    if (el.parentNode.tagName.toUpperCase() === "SVG") {
      el = el.parentNode;
    }

    if (el.classList.contains(this.constructor.handleClass)) {
      $.stopEvent(event);
      this.toggle(el.parentNode);
    } else if (el.classList.contains(this.constructor.targetClass)) {
      if (el.hasAttribute("href")) {
        if (el.classList.contains(this.constructor.activeClass)) {
          if (el.classList.contains(app.views.ListSelect.activeClass)) {
            this.close(el);
          }
        } else {
          this.open(el);
        }
      } else {
        this.toggle(el);
      }
    }
  }
};
app.views.ListSelect = class ListSelect extends app.View {
  static activeClass = "active";

  static events = { click: "onClick" };

  deactivate() {
    if (super.deactivate(...arguments)) {
      this.deselect();
    }
  }

  select(el) {
    this.deselect();
    if (el) {
      el.classList.add(this.constructor.activeClass);
      $.trigger(el, "select");
    }
  }

  deselect() {
    const selection = this.getSelection();
    if (selection) {
      selection.classList.remove(this.constructor.activeClass);
      $.trigger(selection, "deselect");
    }
  }

  selectByHref(href) {
    if (this.getSelection()?.getAttribute("href") !== href) {
      this.select(this.find(`a[href='${href}']`));
    }
  }

  selectCurrent() {
    this.selectByHref(location.pathname + location.hash);
  }

  getSelection() {
    return this.findByClass(this.constructor.activeClass);
  }

  onClick(event) {
    if (event.which !== 1 || event.metaKey || event.ctrlKey) {
      return;
    }
    const target = $.eventTarget(event);
    if (target.tagName === "A") {
      this.select(target);
    }
  }
};
app.views.PaginatedList = class PaginatedList extends app.View {
  static PER_PAGE = app.config.max_results;

  constructor(data) {
    super();
    this.data = data;
    this.constructor.events = this.constructor.events || {};
    if (this.constructor.events.click == null) {
      this.constructor.events.click = "onClick";
    }
  }

  renderPaginated() {
    this.page = 0;

    if (this.totalPages() > 1) {
      this.paginateNext();
    } else {
      this.html(this.renderAll());
    }
  }

  // render: (dataSlice) -> implemented by subclass

  renderAll() {
    return this.render(this.data);
  }

  renderPage(page) {
    return this.render(
      this.data.slice(
        (page - 1) * PaginatedList.PER_PAGE,
        page * PaginatedList.PER_PAGE,
      ),
    );
  }

  renderPageLink(count) {
    return this.tmpl("sidebarPageLink", count);
  }

  renderPrevLink(page) {
    return this.renderPageLink((page - 1) * PaginatedList.PER_PAGE);
  }

  renderNextLink(page) {
    return this.renderPageLink(
      this.data.length - page * PaginatedList.PER_PAGE,
    );
  }

  totalPages() {
    return Math.ceil(this.data.length / PaginatedList.PER_PAGE);
  }

  paginate(link) {
    $.lockScroll(link.nextSibling || link.previousSibling, () => {
      $.batchUpdate(this.el, () => {
        if (link.nextSibling) {
          this.paginatePrev(link);
        } else {
          this.paginateNext(link);
        }
      });
    });
  }

  paginateNext() {
    if (this.el.lastChild) {
      this.remove(this.el.lastChild);
    } // remove link
    if (this.page >= 2) {
      this.hideTopPage();
    } // keep previous page into view
    this.page++;
    this.append(this.renderPage(this.page));
    if (this.page < this.totalPages()) {
      this.append(this.renderNextLink(this.page));
    }
  }

  paginatePrev() {
    this.remove(this.el.firstChild); // remove link
    this.hideBottomPage();
    this.page--;
    this.prepend(this.renderPage(this.page - 1)); // previous page is offset by one
    if (this.page >= 3) {
      this.prepend(this.renderPrevLink(this.page - 1));
    }
  }

  paginateTo(object) {
    const index = this.data.indexOf(object);
    if (index >= PaginatedList.PER_PAGE) {
      for (
        let i = 0, end = Math.floor(index / PaginatedList.PER_PAGE);
        i < end;
        i++
      ) {
        this.paginateNext();
      }
    }
  }

  hideTopPage() {
    const n =
      this.page <= 2 ? PaginatedList.PER_PAGE : PaginatedList.PER_PAGE + 1; // remove link
    for (let i = 0, end = n; i < end; i++) {
      this.remove(this.el.firstChild);
    }
    this.prepend(this.renderPrevLink(this.page));
  }

  hideBottomPage() {
    const n =
      this.page === this.totalPages()
        ? this.data.length % PaginatedList.PER_PAGE || PaginatedList.PER_PAGE
        : PaginatedList.PER_PAGE + 1; // remove link
    for (let i = 0, end = n; i < end; i++) {
      this.remove(this.el.lastChild);
    }
    this.append(this.renderNextLink(this.page - 1));
  }

  onClick(event) {
    const target = $.eventTarget(event);
    if (target.tagName === "SPAN") {
      // link
      $.stopEvent(event);
      this.paginate(target);
    }
  }
};
app.views.Search = class Search extends app.View {
  static SEARCH_PARAM = app.config.search_param;

  static el = "._search";
  static activeClass = "_search-active";

  static elements = {
    input: "._search-input",
    resetLink: "._search-clear",
  };

  static events = {
    input: "onInput",
    click: "onClick",
    submit: "onSubmit",
  };

  static shortcuts = {
    typing: "focus",
    altG: "google",
    altS: "stackoverflow",
    altD: "duckduckgo",
  };

  static routes = { after: "afterRoute" };

  static HASH_RGX = new RegExp(`^#${Search.SEARCH_PARAM}=(.*)`);

  init() {
    this.addSubview((this.scope = new app.views.SearchScope(this.el)));

    this.searcher = new app.Searcher();
    this.searcher
      .on("results", (results) => this.onResults(results))
      .on("end", () => this.onEnd());

    this.scope.on("change", () => this.onScopeChange());

    app.on("ready", () => this.onReady());
    $.on(window, "hashchange", () => this.searchUrl());
    $.on(window, "focus", (event) => this.onWindowFocus(event));
  }

  focus() {
    if (document.activeElement === this.input) {
      return;
    }
    if (app.settings.get("noAutofocus")) {
      return;
    }
    this.input.focus();
  }

  autoFocus() {
    if (app.isMobile() || $.isAndroid() || $.isIOS()) {
      return;
    }
    if (document.activeElement?.tagName === "INPUT") {
      return;
    }
    if (app.settings.get("noAutofocus")) {
      return;
    }
    this.input.focus();
  }

  onWindowFocus(event) {
    if (event.target === window) {
      return this.autoFocus();
    }
  }

  getScopeDoc() {
    if (this.scope.isActive()) {
      return this.scope.getScope();
    }
  }

  reset(force) {
    if (force || !this.input.value) {
      this.scope.reset();
    }
    this.el.reset();
    this.onInput();
    this.autoFocus();
  }

  onReady() {
    this.value = "";
    this.delay(this.onInput);
  }

  onInput() {
    if (
      this.value == null || // ignore events pre-"ready"
      this.value === this.input.value
    ) {
      return;
    }
    this.value = this.input.value;

    if (this.value.length) {
      this.search();
    } else {
      this.clear();
    }
  }

  search(url) {
    if (url == null) {
      url = false;
    }
    this.addClass(this.constructor.activeClass);
    this.trigger("searching");

    this.hasResults = null;
    this.flags = { urlSearch: url, initialResults: true };
    this.searcher.find(this.scope.getScope().entries.all(), "text", this.value);
  }

  searchUrl() {
    if (location.pathname === "/") {
      this.scope.searchUrl();
    } else if (!app.router.isIndex()) {
      return;
    }

    const value = this.extractHashValue();
    if (!value) {
      return;
    }
    this.input.value = this.value = value;
    this.input.setSelectionRange(value.length, value.length);
    this.search(true);
    return true;
  }

  clear() {
    this.removeClass(this.constructor.activeClass);
    this.trigger("clear");
  }

  externalSearch(url) {
    const value = this.value;
    if (value) {
      if (this.scope.name()) {
        value = `${this.scope.name()} ${value}`;
      }
      $.popup(`${url}${encodeURIComponent(value)}`);
      this.reset();
    }
  }

  google() {
    this.externalSearch("https://www.google.com/search?q=");
  }

  stackoverflow() {
    this.externalSearch("https://stackoverflow.com/search?q=");
  }

  duckduckgo() {
    this.externalSearch("https://duckduckgo.com/?t=devdocs&q=");
  }

  onResults(results) {
    if (results.length) {
      this.hasResults = true;
    }
    this.trigger("results", results, this.flags);
    this.flags.initialResults = false;
  }

  onEnd() {
    if (!this.hasResults) {
      this.trigger("noresults");
    }
  }

  onClick(event) {
    if (event.target === this.resetLink) {
      $.stopEvent(event);
      this.reset();
    }
  }

  onSubmit(event) {
    $.stopEvent(event);
  }

  onScopeChange() {
    this.value = "";
    this.onInput();
  }

  afterRoute(name, context) {
    if (app.shortcuts.eventInProgress?.name === "escape") {
      return;
    }
    if (!context.init && app.router.isIndex()) {
      this.reset(true);
    }
    if (context.hash) {
      this.delay(this.searchUrl);
    }
    requestAnimationFrame(() => this.autoFocus());
  }

  extractHashValue() {
    const value = this.getHashValue();
    if (value != null) {
      app.router.replaceHash();
      return value;
    }
  }

  getHashValue() {
    try {
      return Search.HASH_RGX.exec($.urlDecode(location.hash))?.[1];
    } catch (error) {}
  }
};
app.views.SearchScope = class SearchScope extends app.View {
  static SEARCH_PARAM = app.config.search_param;

  static elements = {
    input: "._search-input",
    tag: "._search-tag",
  };

  static events = {
    click: "onClick",
    keydown: "onKeydown",
    textInput: "onTextInput",
  };

  static routes = { after: "afterRoute" };

  static HASH_RGX = new RegExp(`^#${SearchScope.SEARCH_PARAM}=(.+?) .`);

  init() {
    this.placeholder = this.input.getAttribute("placeholder");

    this.searcher = new app.SynchronousSearcher({
      fuzzy_min_length: 2,
      max_results: 1,
    });
    this.searcher.on("results", (results) => this.onResults(results));
  }

  getScope() {
    return this.doc || app;
  }

  isActive() {
    return !!this.doc;
  }

  name() {
    return this.doc?.name;
  }

  search(value, searchDisabled) {
    if (searchDisabled == null) {
      searchDisabled = false;
    }
    if (this.doc) {
      return;
    }
    this.searcher.find(app.docs.all(), "text", value);
    if (!this.doc && searchDisabled) {
      this.searcher.find(app.disabledDocs.all(), "text", value);
    }
  }

  searchUrl() {
    const value = this.extractHashValue();
    if (value) {
      this.search(value, true);
    }
  }

  onResults(results) {
    const doc = results[0];
    if (!doc) {
      return;
    }
    if (app.docs.contains(doc)) {
      this.selectDoc(doc);
    } else {
      this.redirectToDoc(doc);
    }
  }

  selectDoc(doc) {
    const previousDoc = this.doc;
    if (doc === previousDoc) {
      return;
    }
    this.doc = doc;

    this.tag.textContent = doc.fullName;
    // this.tag.style.display = "block";

    this.input.removeAttribute("placeholder");
    this.input.value = this.input.value.slice(this.input.selectionStart);
    // this.input.style.paddingLeft = this.tag.offsetWidth + 10 + "px";

    $.trigger(this.input, "input");
    this.trigger("change", this.doc, previousDoc);
  }

  redirectToDoc(doc) {
    const { hash } = location;
    app.router.replaceHash("");
    location.assign(doc.fullPath() + hash);
  }

  reset() {
    if (!this.doc) {
      return;
    }
    const previousDoc = this.doc;
    this.doc = null;

    this.tag.textContent = "";
    this.tag.style.display = "none";

    this.input.setAttribute("placeholder", this.placeholder);
    this.input.style.paddingLeft = "";

    this.trigger("change", null, previousDoc);
  }

  doScopeSearch(event) {
    this.search(this.input.value.slice(0, this.input.selectionStart));
    if (this.doc) {
      $.stopEvent(event);
    }
  }

  onClick(event) {
    if (event.target === this.tag) {
      this.reset();
      $.stopEvent(event);
    }
  }

  onKeydown(event) {
    if (event.which === 8) {
      // backspace
      if (this.doc && this.input.selectionEnd === 0) {
        this.reset();
        $.stopEvent(event);
      }
    } else if (!this.doc && this.input.value && !$.isChromeForAndroid()) {
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
        return;
      }
      if (
        event.which === 9 || // tab
        (event.which === 32 && app.isMobile())
      ) {
        // space
        this.doScopeSearch(event);
      }
    }
  }

  onTextInput(event) {
    if (!$.isChromeForAndroid()) {
      return;
    }
    if (!this.doc && this.input.value && event.data === " ") {
      this.doScopeSearch(event);
    }
  }

  extractHashValue() {
    const value = this.getHashValue();
    if (value) {
      const newHash = $.urlDecode(location.hash).replace(
        `#${SearchScope.SEARCH_PARAM}=${value} `,
        `#${SearchScope.SEARCH_PARAM}=`
      );
      app.router.replaceHash(newHash);
      return value;
    }
  }

  getHashValue() {
    try {
      return SearchScope.HASH_RGX.exec($.urlDecode(location.hash))?.[1];
    } catch (error) {}
  }

  afterRoute(name, context) {
    if (!app.isSingleDoc() && context.init && context.doc) {
      this.selectDoc(context.doc);
    }
  }
};
app.views.DocList = class DocList extends app.View {
  static className = "_list";
  static attributes = { role: "navigation" };

  static events = {
    open: "onOpen",
    close: "onClose",
    click: "onClick",
  };

  static routes = { after: "afterRoute" };

  static elements = {
    disabledTitle: "._list-title",
    disabledList: "._disabled-list",
  };

  init() {
    this.lists = {};

    this.addSubview((this.listFocus = new app.views.ListFocus(this.el)));
    this.addSubview((this.listFold = new app.views.ListFold(this.el)));
    this.addSubview((this.listSelect = new app.views.ListSelect(this.el)));

    app.on("ready", () => this.render());
  }

  activate() {
    if (super.activate(...arguments)) {
      for (var slug in this.lists) {
        var list = this.lists[slug];
        list.activate();
      }
      this.listSelect.selectCurrent();
    }
  }

  deactivate() {
    if (super.deactivate(...arguments)) {
      for (var slug in this.lists) {
        var list = this.lists[slug];
        list.deactivate();
      }
    }
  }

  render() {
    let html = "";
    for (var doc of app.docs.all()) {
      html += this.tmpl("sidebarDoc", doc, {
        fullName: app.docs.countAllBy("name", doc.name) > 1,
      });
    }
    this.html(html);
    if (!app.isSingleDoc() && app.disabledDocs.size() !== 0) {
      this.renderDisabled();
    }
  }

  renderDisabled() {
    this.append(
      this.tmpl("sidebarDisabled", { count: app.disabledDocs.size() })
    );
    this.refreshElements();
    this.renderDisabledList();
  }

  renderDisabledList() {
    if (app.settings.get("hideDisabled")) {
      this.removeDisabledList();
    } else {
      this.appendDisabledList();
    }
  }

  appendDisabledList() {
    let doc;
    let html = "";
    const docs = [].concat(...(app.disabledDocs.all() || []));

    while ((doc = docs.shift())) {
      if (doc.version != null) {
        var versions = "";
        while (true) {
          versions += this.tmpl("sidebarDoc", doc, { disabled: true });
          if (docs[0]?.name !== doc.name) {
            break;
          }
          doc = docs.shift();
        }
        html += this.tmpl("sidebarDisabledVersionedDoc", doc, versions);
      } else {
        html += this.tmpl("sidebarDoc", doc, { disabled: true });
      }
    }

    this.append(this.tmpl("sidebarDisabledList", html));
    this.disabledTitle.classList.add("open-title");
    this.refreshElements();
  }

  removeDisabledList() {
    if (this.disabledList) {
      $.remove(this.disabledList);
    }
    this.disabledTitle.classList.remove("open-title");
    this.refreshElements();
  }

  reset(options) {
    if (options == null) {
      options = {};
    }
    this.listSelect.deselect();
    if (this.listFocus != null) {
      this.listFocus.blur();
    }
    this.listFold.reset();
    if (options.revealCurrent || app.isSingleDoc()) {
      this.revealCurrent();
    }
  }

  onOpen(event) {
    $.stopEvent(event);
    const doc = app.docs.findBy("slug", event.target.getAttribute("data-slug"));

    if (doc && !this.lists[doc.slug]) {
      this.lists[doc.slug] = doc.types.isEmpty()
        ? new app.views.EntryList(doc.entries.all())
        : new app.views.TypeList(doc);
      $.after(event.target, this.lists[doc.slug].el);
    }
  }

  onClose(event) {
    $.stopEvent(event);
    const doc = app.docs.findBy("slug", event.target.getAttribute("data-slug"));

    if (doc && this.lists[doc.slug]) {
      this.lists[doc.slug].detach();
      delete this.lists[doc.slug];
    }
  }

  select(model) {
    this.listSelect.selectByHref(model?.fullPath());
  }

  reveal(model) {
    this.openDoc(model.doc);
    if (model.type) {
      this.openType(model.getType());
    }
    this.focus(model);
    this.paginateTo(model);
    this.scrollTo(model);
  }

  focus(model) {
    if (this.listFocus != null) {
      this.listFocus.focus(this.find(`a[href='${model.fullPath()}']`));
    }
  }

  revealCurrent() {
    const model = app.router.context.type || app.router.context.entry;
    if (model) {
      this.reveal(model);
      this.select(model);
    }
  }

  openDoc(doc) {
    if (app.disabledDocs.contains(doc) && doc.version) {
      this.listFold.open(
        this.find(`[data-slug='${doc.slug_without_version}']`),
      );
    }
    this.listFold.open(this.find(`[data-slug='${doc.slug}']`));
  }

  closeDoc(doc) {
    this.listFold.close(this.find(`[data-slug='${doc.slug}']`));
  }

  openType(type) {
    this.listFold.open(
      this.lists[type.doc.slug].find(`[data-slug='${type.slug}']`),
    );
  }

  paginateTo(model) {
    if (this.lists[model.doc.slug] != null) {
      this.lists[model.doc.slug].paginateTo(model);
    }
  }

  scrollTo(model) {
    $.scrollTo(this.find(`a[href='${model.fullPath()}']`), null, "top", {
      margin: app.isMobile() ? 48 : 0,
    });
  }

  toggleDisabled() {
    if (this.disabledTitle.classList.contains("open-title")) {
      this.removeDisabledList();
      app.settings.set("hideDisabled", true);
    } else {
      this.appendDisabledList();
      app.settings.set("hideDisabled", false);
    }
  }

  onClick(event) {
    const target = $.eventTarget(event);
    if (
      this.disabledTitle &&
      $.hasChild(this.disabledTitle, target) &&
      target.tagName !== "A"
    ) {
      $.stopEvent(event);
      this.toggleDisabled();
      return;
    }
    const slug = target.getAttribute("data-enable");
    if (slug) {
      $.stopEvent(event);
      const doc = app.disabledDocs.findBy("slug", slug);
      if (doc) {
        this.onEnabled = this.onEnabled.bind(this);
        app.enableDoc(doc, this.onEnabled, this.onEnabled);
      }
    }
  }

  onEnabled() {
    this.reset();
    this.render();
  }

  afterRoute(route, context) {
    if (context.init) {
      if (this.activated) {
        this.reset({ revealCurrent: true });
      }
    } else {
      this.select(context.type || context.entry);
    }
  }
};
app.views.DocPicker = class DocPicker extends app.View {
  static className = "_list _list-picker";

  static events = {
    mousedown: "onMouseDown",
    mouseup: "onMouseUp",
  };

  init() {
    this.addSubview((this.listFold = new app.views.ListFold(this.el)));
  }

  activate() {
    if (super.activate(...arguments)) {
      this.render();
      this.onDOMFocus = this.onDOMFocus.bind(this);
      $.on(this.el, "focus", this.onDOMFocus, true);
    }
  }

  deactivate() {
    if (super.deactivate(...arguments)) {
      this.empty();
      $.off(this.el, "focus", this.onDOMFocus, true);
      this.focusEl = null;
    }
  }

  render() {
    let doc;
    let html = this.tmpl("docPickerHeader");
    let docs = app.docs.all().concat(...(app.disabledDocs.all() || []));

    while ((doc = docs.shift())) {
      if (doc.version != null) {
        var versions;
        [docs, versions] = this.extractVersions(docs, doc);
        html += this.tmpl(
          "sidebarVersionedDoc",
          doc,
          this.renderVersions(versions),
          { open: app.docs.contains(doc) },
        );
      } else {
        html += this.tmpl("sidebarLabel", doc, {
          checked: app.docs.contains(doc),
        });
      }
    }

    this.html(html + this.tmpl("docPickerNote"));

    requestAnimationFrame(() => this.findByTag("input")?.focus());
  }

  renderVersions(docs) {
    let html = "";
    for (var doc of docs) {
      html += this.tmpl("sidebarLabel", doc, {
        checked: app.docs.contains(doc),
      });
    }
    return html;
  }

  extractVersions(originalDocs, version) {
    const docs = [];
    const versions = [version];
    for (var doc of originalDocs) {
      (doc.name === version.name ? versions : docs).push(doc);
    }
    return [docs, versions];
  }

  empty() {
    this.resetClass();
    super.empty(...arguments);
  }

  getSelectedDocs() {
    return [...this.findAllByTag("input")]
      .filter((input) => input?.checked)
      .map((input) => input.name);
  }

  onMouseDown() {
    this.mouseDown = Date.now();
  }

  onMouseUp() {
    this.mouseUp = Date.now();
  }

  onDOMFocus(event) {
    const { target } = event;
    if (target.tagName === "INPUT") {
      if (
        (!this.mouseDown || !(Date.now() < this.mouseDown + 100)) &&
        (!this.mouseUp || !(Date.now() < this.mouseUp + 100))
      ) {
        $.scrollTo(target.parentNode, null, "continuous");
      }
    } else if (target.classList.contains(app.views.ListFold.targetClass)) {
      target.blur();
      if (!this.mouseDown || !(Date.now() < this.mouseDown + 100)) {
        if (this.focusEl === $("input", target.nextElementSibling)) {
          if (target.classList.contains(app.views.ListFold.activeClass)) {
            this.listFold.close(target);
          }
          let prev = target.previousElementSibling;
          while (
            prev.tagName !== "LABEL" &&
            !prev.classList.contains(app.views.ListFold.targetClass)
          ) {
            prev = prev.previousElementSibling;
          }
          if (prev.classList.contains(app.views.ListFold.activeClass)) {
            prev = $.makeArray($$("input", prev.nextElementSibling)).pop();
          }
          this.delay(() => prev.focus());
        } else {
          if (!target.classList.contains(app.views.ListFold.activeClass)) {
            this.listFold.open(target);
          }
          this.delay(() => $("input", target.nextElementSibling).focus());
        }
      }
    }
    this.focusEl = target;
  }
};

app.views.EntryList = class EntryList extends app.views.PaginatedList {
  static tagName = "div";
  static className = "_list _list-sub";

  constructor(entries) {
    super(...arguments);
    this.entries = entries;
    this.init0(); // needs this.data from PaginatedList
    this.refreshElements();
  }

  init0() {
    this.renderPaginated();
    this.activate();
  }

  render(entries) {
    return this.tmpl("sidebarEntry", entries);
  }
};
app.views.Results = class Results extends app.View {
  static className = "_list";

  static events = { click: "onClick" };

  static routes = { after: "afterRoute" };

  constructor(sidebar, search) {
    super();
    this.sidebar = sidebar;
    this.search = search;
    this.init0(); // needs this.search
    this.refreshElements();
  }

  deactivate() {
    if (super.deactivate(...arguments)) {
      this.empty();
    }
  }

  init0() {
    this.addSubview((this.listFocus = new app.views.ListFocus(this.el)));
    this.addSubview((this.listSelect = new app.views.ListSelect(this.el)));

    this.search
      .on("results", (entries, flags) => this.onResults(entries, flags))
      .on("noresults", () => this.onNoResults())
      .on("clear", () => this.onClear());
  }

  onResults(entries, flags) {
    if (flags.initialResults) {
      this.listFocus?.blur();
    }
    if (flags.initialResults) {
      this.empty();
    }
    this.append(this.tmpl("sidebarResult", entries));

    if (flags.initialResults) {
      if (flags.urlSearch) {
        this.openFirst();
      } else {
        this.focusFirst();
      }
    }
  }

  onNoResults() {
    this.html(this.tmpl("sidebarNoResults"));
  }

  onClear() {
    this.empty();
  }

  focusFirst() {
    if (!app.isMobile()) {
      this.listFocus?.focusOnNextFrame(this.el.firstElementChild);
    }
  }

  openFirst() {
    this.el.firstElementChild?.click();
  }

  onDocEnabled(doc) {
    app.router.show(doc.fullPath());
    return this.sidebar.onDocEnabled();
  }

  afterRoute(route, context) {
    if (route === "entry") {
      this.listSelect.selectByHref(context.entry.fullPath());
    } else {
      this.listSelect.deselect();
    }
  }

  onClick(event) {
    if (event.which !== 1) {
      return;
    }
    const slug = $.eventTarget(event).getAttribute("data-enable");
    if (slug) {
      $.stopEvent(event);
      const doc = app.disabledDocs.findBy("slug", slug);
      if (doc) {
        return app.enableDoc(doc, this.onDocEnabled.bind(this, doc), $.noop);
      }
    }
  }
};
app.views.Sidebar = class Sidebar extends app.View {
  static el = "._sidebar";

  static events = {
    focus: "onFocus",
    select: "onSelect",
    click: "onClick",
  };

  static routes = { after: "afterRoute" };

  static shortcuts = {
    altR: "onAltR",
    escape: "onEscape",
  };
  static elements = {
    siderlist: '._list-wrap'
  }

  init() {
    if (!app.isMobile()) {
      this.addSubview((this.hover = new app.views.SidebarHover(this.el)));
    }
    this.addSubview((this.search = new app.views.Search()));

    this.search
      .on("searching", () => this.onSearching())
      .on("clear", () => this.onSearchClear())
      .scope.on("change", (newDoc, previousDoc) =>
        this.onScopeChange((newDoc, previousDoc)),
      );

    this.results = new app.views.Results(this, this.search);
    this.docList = new app.views.DocList();

    app.on("ready", () => this.onReady());

    // $.on(document.documentElement, "mouseleave", () => this.display());
    // $.on(document.documentElement, "mouseenter", () =>
    //   this.resetDisplay({ forceNoHover: false }),
    // );

    $.on(document.documentElement, 'mouseleave', event => { if (!(event.clientX <= 0)) { return this.display(); } });
    $.on(document.documentElement, 'mouseenter', () => this.resetDisplay({forceNoHover: false}));
  }

  hide() {
    this.removeClass("show");
  }

  display() {
    this.addClass("show");
  }

  resetDisplay(options) {
    if (options == null) {
      options = {};
    }
    if (!this.hasClass("show")) {
      return;
    }
    this.removeClass("show");

    if (options.forceNoHover !== false && !this.hasClass("no-hover")) {
      this.addClass("no-hover");
      this.resetHoverOnMouseMove = this.resetHoverOnMouseMove.bind(this);
      $.on(window, "mousemove", this.resetHoverOnMouseMove);
    }
  }

  resetHoverOnMouseMove() {
    $.off(window, "mousemove", this.resetHoverOnMouseMove);
    return requestAnimationFrame(() => this.resetHover());
  }

  resetHover() {
    return this.removeClass("no-hover");
  }

  showView(view) {
    if (this.view !== view) {
      if (this.hover != null) {
        this.hover.hide();
      }
      this.saveScrollPosition();
      if (this.view != null) {
        this.view.deactivate();
      }
      this.view = view;
      this.render();
      this.view.activate();
      this.restoreScrollPosition();
    }
  }

  render() {
    // this.html(this.view);
    // @w3cub
    this.inserthtml(this.siderlist, this.view);
  }

  showDocList() {
    this.showView(this.docList);
  }

  showResults() {
    this.display();
    this.showView(this.results);
  }

  reset() {
    this.display();
    this.showDocList();
    this.docList.reset();
    this.search.reset();
  }

  onReady() {
    this.view = this.docList;
    this.render();
    this.view.activate();
  }

  onScopeChange(newDoc, previousDoc) {
    if (previousDoc) {
      this.docList.closeDoc(previousDoc);
    }
    if (newDoc) {
      this.docList.reveal(newDoc.toEntry());
    } else {
      this.scrollToTop();
    }
  }

  saveScrollPosition() {
    if (this.view === this.docList) {
      this.scrollTop = this.el.scrollTop;
    }
  }

  restoreScrollPosition() {
    if (this.view === this.docList && this.scrollTop) {
      this.el.scrollTop = this.scrollTop;
      this.scrollTop = null;
    } else {
      this.scrollToTop();
    }
  }

  scrollToTop() {
    this.el.scrollTop = 0;
  }

  onSearching() {
    this.showResults();
  }

  onSearchClear() {
    this.resetDisplay();
    this.showDocList();
  }

  onFocus(event) {
    this.display();
    if (event.target !== this.el) {
      $.scrollTo(event.target, this.el, "continuous", { bottomGap: 2 });
    }
  }

  onSelect() {
    this.resetDisplay();
  }

  onClick(event) {
    if (event.which !== 1) {
      return;
    }
    if ($.eventTarget(event).hasAttribute?.("data-reset-list")) {
      $.stopEvent(event);
      this.onAltR();
    }
  }

  onAltR() {
    this.reset();
    this.docList.reset({ revealCurrent: true });
    this.display();
  }

  onEscape() {
    const doc = this.search.getScopeDoc();
    this.reset();
    this.resetDisplay();
    if (doc) {
      this.docList.reveal(doc.toEntry());
    } else {
      this.scrollToTop();
    }
  }

  onDocEnabled() {
    this.docList.onEnabled();
    this.reset();
  }

  afterRoute(name, context) {
    if (
      (app.shortcuts.eventInProgress != null
        ? app.shortcuts.eventInProgress.name
        : undefined) === "escape"
    ) {
      return;
    }
    if (!context.init && app.router.isIndex()) {
      this.reset();
    }
    this.resetDisplay();
  }
};
app.views.SidebarHover = class SidebarHover extends app.View {
  static itemClass = "_list-hover";

  static events = {
    focus: "onFocus",
    blur: "onBlur",
    mouseover: "onMouseover",
    mouseout: "onMouseout",
    scroll: "onScroll",
    click: "onClick",
  };

  static routes = { after: "onRoute" };

  show(el) {
    if (el !== this.cursor) {
      this.hide();
      if (this.isTarget(el) && this.isTruncated(el.lastElementChild || el)) {
        this.cursor = el;
        this.clone = this.makeClone(this.cursor);
        $.append(document.body, this.clone);
        if (this.offsetTop == null) {
          this.offsetTop = this.el.offsetTop;
        }
        this.position();
      }
    }
  }

  hide() {
    if (this.cursor) {
      $.remove(this.clone);
      this.cursor = this.clone = null;
    }
  }

  position() {
    if (this.cursor) {
      const rect = $.rect(this.cursor);
      if (rect.top >= this.offsetTop) {
        this.clone.style.top = rect.top + "px";
        this.clone.style.left = rect.left + "px";
      } else {
        this.hide();
      }
    }
  }

  makeClone(el) {
    const clone = el.cloneNode(true);
    clone.classList.add("clone");
    return clone;
  }

  isTarget(el) {
    return el.classList?.contains(this.constructor.itemClass);
  }

  isSelected(el) {
    return el.classList.contains("active");
  }

  isTruncated(el) {
    return el.scrollWidth > el.offsetWidth;
  }

  onFocus(event) {
    this.focusTime = Date.now();
    this.show(event.target);
  }

  onBlur() {
    this.hide();
  }

  onMouseover(event) {
    if (
      this.isTarget(event.target) &&
      !this.isSelected(event.target) &&
      this.mouseActivated()
    ) {
      this.show(event.target);
    }
  }

  onMouseout(event) {
    if (this.isTarget(event.target) && this.mouseActivated()) {
      this.hide();
    }
  }

  mouseActivated() {
    // Skip mouse events caused by focus events scrolling the sidebar.
    return !this.focusTime || Date.now() - this.focusTime > 500;
  }

  onScroll() {
    this.position();
  }

  onClick(event) {
    if (event.target === this.clone) {
      $.click(this.cursor);
    }
  }

  onRoute() {
    this.hide();
  }
};
app.views.TypeList = class TypeList extends app.View {
  static tagName = "div";
  static className = "_list _list-sub";

  static events = {
    open: "onOpen",
    close: "onClose",
  };

  constructor(doc) {
    super();
    this.doc = doc;
    this.init0(); // needs this.doc
    this.refreshElements();
  }

  init0() {
    this.lists = {};
    this.render();
    this.activate();
  }

  activate() {
    if (super.activate(...arguments)) {
      for (var slug in this.lists) {
        var list = this.lists[slug];
        list.activate();
      }
    }
  }

  deactivate() {
    if (super.deactivate(...arguments)) {
      for (var slug in this.lists) {
        var list = this.lists[slug];
        list.deactivate();
      }
    }
  }

  render() {
    let html = "";
    for (var group of this.doc.types.groups()) {
      html += this.tmpl("sidebarType", group);
    }
    return this.html(html);
  }

  onOpen(event) {
    $.stopEvent(event);
    const type = this.doc.types.findBy(
      "slug",
      event.target.getAttribute("data-slug"),
    );

    if (type && !this.lists[type.slug]) {
      this.lists[type.slug] = new app.views.EntryList(type.entries());
      $.after(event.target, this.lists[type.slug].el);
    }
  }

  onClose(event) {
    $.stopEvent(event);
    const type = this.doc.types.findBy(
      "slug",
      event.target.getAttribute("data-slug"),
    );

    if (type && this.lists[type.slug]) {
      this.lists[type.slug].detach();
      delete this.lists[type.slug];
    }
  }

  paginateTo(model) {
    if (model.type) {
      this.lists[model.getType().slug]?.paginateTo(model);
    }
  }
};
app.views.ToTopView = class ToTopView extends app.View {

  constructor(...args) {
    super(...args);
  }

  static tagName = 'a';
  static className = '_totop';

  static events = {
    click: 'onClick',
    touchend: 'onTouchEnd'
  };

  init() {
    this.activate();
    this.render();
    return this.bindContentScroll();
  }
  bindContentScroll() {
    this._content = document.documentElement;
    const timer = undefined;

    const addEventListener = function(el, evt, fn) {
      if (window.addEventListener) { el.addEventListener(evt, fn, false); } else if (window.attachEvent) { el.attachEvent('on' + evt, fn); } else { el['on' + evt] = fn; }
    };

    addEventListener(window, "scroll", ()  => {
      timer && clearTimeout(timer);
      return setTimeout(() => {
        return this.updatePosition();
      }
      , 50);
    });
    addEventListener(window, "load", ()  => {
      return this.updatePosition();
    });
    return this.updatePosition();
  }
  render() {
    this.el.setAttribute('href', 'javascript:;');
    this.el.setAttribute('title', 'Go to Top');
    return document.body.appendChild(this.el);
  }
  show() {
    return this.el.style.display = 'block';
  }

  hide() {
    return this.el.style.display = 'none';
  }
  onTouchEnd() {
    // cancel hover status
    return this.el.blur();
  }
  onClick() {
    this.el.focus();
    const content = this._content;
    return $.animate(content, (function(process){
        return this.scrollTop = process;
      }), content.scrollTop, 0, 500);
  }

  updatePosition() {
    if (this._content.scrollTop > 100) {
      return this.show();
    } else {
      return this.hide();
    }
  }
};

app.views.Content = class Content extends app.View {
  static el = "._content";
  static loadingClass = "_content-loading";

  static events = { click: "onClick" };

  static shortcuts = {
    altUp: "scrollStepUp",
    altDown: "scrollStepDown",
    pageUp: "scrollPageUp",
    pageDown: "scrollPageDown",
    pageTop: "scrollToTop",
    pageBottom: "scrollToBottom",
    altF: "onAltF",
  };

  static routes = {
    before: "beforeRoute",
    after: "afterRoute",
  };

  init() {
    this.scrollEl = app.isMobile()
      ? document.scrollingElement || document.body
      : this.el;
    this.scrollMap = {};
    this.scrollStack = [];

    // this.rootPage = new app.views.RootPage();
    // this.staticPage = new app.views.StaticPage();
    // this.settingsPage = new app.views.SettingsPage();
    // this.offlinePage = new app.views.OfflinePage();
    // this.typePage = new app.views.TypePage();
    this.entryPage = new app.views.EntryPage();
    

    this.entryPage
      .on("loading", () => this.onEntryLoading())
      .on("loaded", () => this.onEntryLoaded());

    app
      .on("ready", () => this.onReady())
      .on("bootError", () => this.onBootError());
  }

  show(view) {
    this.hideLoading();
    if (view !== this.view) {
      if (this.view != null) {
        this.view.deactivate();
      }
      // this.html((this.view = view));
      // @w3cub
      this.view = view;
      this.view.activate();
    }
  }

  showLoading() {
    this.addClass(this.constructor.loadingClass);
  }

  isLoading() {
    return this.el.classList.contains(this.constructor.loadingClass);
  }

  hideLoading() {
    this.removeClass(this.constructor.loadingClass);
  }

  scrollTo(value) {
    this.scrollEl.scrollTop = value || 0;
  }

  smoothScrollTo(value) {
    if (app.settings.get("fastScroll")) {
      this.scrollTo(value);
    } else {
      $.smoothScroll(this.scrollEl, value || 0);
    }
  }

  scrollBy(n) {
    this.smoothScrollTo(this.scrollEl.scrollTop + n);
  }

  scrollToTop() {
    this.smoothScrollTo(0);
  }

  scrollToBottom() {
    this.smoothScrollTo(this.scrollEl.scrollHeight);
  }

  scrollStepUp() {
    this.scrollBy(-80);
  }

  scrollStepDown() {
    this.scrollBy(80);
  }

  scrollPageUp() {
    this.scrollBy(40 - this.scrollEl.clientHeight);
  }

  scrollPageDown() {
    this.scrollBy(this.scrollEl.clientHeight - 40);
  }

  scrollToTarget() {
    let el;
    if (
      this.routeCtx.hash &&
      (el = this.findTargetByHash(this.routeCtx.hash))
    ) {
      $.scrollToWithImageLock(el, this.scrollEl, "top", {
        margin: this.scrollEl === this.el ? 0 : $.offset(this.el).top,
      });
      $.openDetailsAncestors(el);
      $.highlight(el, { className: "_highlight" });
    } else {
      this.scrollTo(this.scrollMap[this.routeCtx.state.id]);
    }
  }

  onReady() {
    this.hideLoading();
  }

  onBootError() {
    this.hideLoading();
    this.html(this.tmpl("bootError"));
  }

  onEntryLoading() {
    this.showLoading();
    if (this.scrollToTargetTimeout) {
      clearTimeout(this.scrollToTargetTimeout);
      this.scrollToTargetTimeout = null;
    }
  }

  onEntryLoaded() {
    this.hideLoading();
    if (this.scrollToTargetTimeout) {
      clearTimeout(this.scrollToTargetTimeout);
      this.scrollToTargetTimeout = null;
    }
    this.scrollToTarget();
  }

  beforeRoute(context) {
    this.cacheScrollPosition();
    this.routeCtx = context;
    this.scrollToTargetTimeout = this.delay(this.scrollToTarget);
  }

  cacheScrollPosition() {
    if (!this.routeCtx || this.routeCtx.hash) {
      return;
    }
    if (this.routeCtx.path === "/") {
      return;
    }

    if (this.scrollMap[this.routeCtx.state.id] == null) {
      this.scrollStack.push(this.routeCtx.state.id);
      while (this.scrollStack.length > app.config.history_cache_size) {
        delete this.scrollMap[this.scrollStack.shift()];
      }
    }

    this.scrollMap[this.routeCtx.state.id] = this.scrollEl.scrollTop;
  }

  afterRoute(route, context) {
    if (route !== "entry" && route !== "type") {
      resetFavicon();
    }

    switch (route) {
      case "root":
        this.show(this.rootPage);
        break;
      case "entry":
        this.show(this.entryPage);
        break;
      case "type":
        this.show(this.typePage);
        break;
      case "settings":
        this.show(this.settingsPage);
        break;
      case "offline":
        this.show(this.offlinePage);
        break;
      default:
        this.show(this.staticPage);
    }

    this.view.onRoute(context);
    app.document.setTitle(
      typeof this.view.getTitle === "function"
        ? this.view.getTitle()
        : undefined,
    );
  }

  onClick(event) {
    const link = $.closestLink($.eventTarget(event), this.el);
    if (link && this.isExternalUrl(link.getAttribute("href"))) {
      $.stopEvent(event);
      $.popup(link);
    }
  }

  onAltF(event) {
    if (
      !document.activeElement ||
      !$.hasChild(this.el, document.activeElement)
    ) {
      this.find("a:not(:empty)")?.focus();
      return $.stopEvent(event);
    }
  }

  findTargetByHash(hash) {
    let el = (() => {
      try {
        return $.id(decodeURIComponent(hash));
      } catch (error) {}
    })();
    if (!el) {
      el = (() => {
        try {
          return $.id(hash);
        } catch (error1) {}
      })();
    }
    return el;
  }

  isExternalUrl(url) {
    return url?.startsWith("http:") || url?.startsWith("https:");
  }
};
app.views.EntryPage = class EntryPage extends app.View {
  static className = "_page";
  static errorClass = "_page-error";

  static events = { click: "onClick" };

  static shortcuts = {
    altC: "onAltC",
    altO: "onAltO",
  };

  static routes = { before: "beforeRoute" };

  static LINKS = {
    home: "Homepage",
    code: "Source code",
  };

  init() {
    this.cacheMap = {};
    this.cacheStack = [];
  }

  deactivate() {
    if (super.deactivate(...arguments)) {
      this.empty();
      this.entry = null;
    }
  }

  loading() {
    this.empty();
    this.trigger("loading");
  }
  render(content, fromCache) {
    if (content == null) {
      content = "";
    }
    if (fromCache == null) {
      fromCache = false;
    }
    if (!this.activated) {
      return;
    }
    // this.empty();
    this.subview = new (this.subViewClass())(this.el, this.entry);
    this.subview.render(this.el, fromCache);

    if (!fromCache) {
      this.addCopyButtons();
    }
    // $.batchUpdate(this.el, () => {
    //   this.subview.render(content, fromCache);
    //   if (!fromCache) {
    //     this.addCopyButtons();
    //   }
    // });

    // if (app.disabledDocs.findBy("slug", this.entry.doc.slug)) {
    //   this.hiddenView = new app.views.HiddenPage(this.el, this.entry);
    // }

    // setFaviconForDoc(this.entry.doc);
    this.delay(this.polyfillMathML);
    this.trigger("loaded");
  }

  addCopyButtons() {
    if (!this.copyButton) {
      this.copyButton = document.createElement("button");
      this.copyButton.innerHTML = '<svg><use xlink:href="#icon-copy"/></svg>';
      this.copyButton.type = "button";
      this.copyButton.className = "_pre-clip";
      this.copyButton.title = "Copy to clipboard";
      this.copyButton.setAttribute("aria-label", "Copy to clipboard");
    }
    for (var el of this.findAllByTag("pre")) {
      el.appendChild(this.copyButton.cloneNode(true));
    }
  }

  polyfillMathML() {
    if (
      window.supportsMathML !== false ||
      !!this.polyfilledMathML ||
      !this.findByTag("math")
    ) {
      return;
    }
    this.polyfilledMathML = true;
    $.append(
      document.head,
      `<link rel="stylesheet" href="${app.config.mathml_stylesheet}">`,
    );
  }

  prepareContent(content) {
    if (!this.entry.isIndex() || !this.entry.doc.links) {
      return content;
    }

    const links = Object.entries(this.entry.doc.links).map(([link, url]) => {
      return `<a href="${url}" class="_links-link">${EntryPage.LINKS[link]}</a>`;
    });

    return `<p class="_links">${links.join("")}</p>${content}`;
  }

  empty() {
    if (this.subview != null) {
      this.subview.deactivate();
    }
    this.subview = null;

    if (this.hiddenView != null) {
      this.hiddenView.deactivate();
    }
    this.hiddenView = null;

    this.resetClass();
    super.empty(...arguments);
  }

  subViewClass() {
    return (
      app.views[`${$.classify(this.entry.doc.type)}Page`] || app.views.BasePage
    );
  }

  getTitle() {
    return (
      this.entry.doc.fullName +
      (this.entry.isIndex() ? " documentation" : ` / ${this.entry.name}`)
    );
  }

  beforeRoute() {
    this.cache();
    this.abort();
  }

  onRoute(context) {
    // const isSameFile = context.entry.filePath() === this.entry?.filePath?.();
    this.entry = context.entry;
    this.render();
    // if (!isSameFile) {
    //   this.restore() || this.load();
    // }
  }

  load() {
    this.loading();
    this.xhr = this.entry.loadFile(
      (response) => this.onSuccess(response),
      () => this.onError(),
    );
  }

  abort() {
    if (this.xhr) {
      this.xhr.abort();
      this.xhr = this.entry = null;
    }
  }

  onSuccess(response) {
    if (!this.activated) {
      return;
    }
    this.xhr = null;
    this.render(this.prepareContent(response));
  }

  onError() {
    this.xhr = null;
    this.render(this.tmpl("pageLoadError"));
    this.resetClass();
    this.addClass(this.constructor.errorClass);
    if (app.serviceWorker != null) {
      app.serviceWorker.update();
    }
  }

  cache() {
    let path;
    if (
      this.xhr ||
      !this.entry ||
      this.cacheMap[(path = this.entry.filePath())]
    ) {
      return;
    }

    this.cacheMap[path] = this.el.innerHTML;
    this.cacheStack.push(path);

    while (this.cacheStack.length > app.config.history_cache_size) {
      delete this.cacheMap[this.cacheStack.shift()];
    }
  }

  restore() {
    const path = this.entry.filePath();
    if (this.cacheMap[[path]]) {
      this.render(this.cacheMap[path], true);
      return true;
    }
  }

  onClick(event) {
    const target = $.eventTarget(event);
    if (target.hasAttribute("data-retry")) {
      $.stopEvent(event);
      this.load();
    } else if (target.classList.contains("_pre-clip")) {
      $.stopEvent(event);
      navigator.clipboard.writeText(target.parentNode.textContent).then(
        () => target.classList.add("_pre-clip-success"),
        () => target.classList.add("_pre-clip-error"),
      );
      setTimeout(() => (target.className = "_pre-clip"), 2000);
    }
  }

  onAltC() {
    const link = this.find("._attribution:last-child ._attribution-link");
    if (!link) {
      return;
    }
    console.log(link.href + location.hash);
    navigator.clipboard.writeText(link.href + location.hash);
  }

  onAltO() {
    const link = this.find("._attribution:last-child ._attribution-link");
    if (!link) {
      return;
    }
    this.delay(() => $.popup(link.href + location.hash));
  }
};
app.templates.render = function (name, value, ...args) {
  const template = app.templates[name];

  if (Array.isArray(value)) {
    let result = "";
    for (var val of value) {
      result += template(val, ...args);
    }
    return result;
  } else if (typeof template === "function") {
    return template(value, ...args);
  } else {
    return template;
  }
};
const { templates } = app;

const arrow = '<svg class="_list-arrow"><use xlink:href="#icon-dir"/></svg>';

templates.sidebarDoc = function (doc, options) {
  if (options == null) {
    options = {};
  }
  let link = `<a href="${doc.fullPath()}" class="_list-item _icon-${doc.icon} `;
  link += options.disabled ? "_list-disabled" : "_list-dir";
  link += `" data-slug="${doc.slug}" title="${doc.fullName}" tabindex="-1">`;
  if (options.disabled) {
    link += `<span class="_list-enable" data-enable="${doc.slug}">Enable</span>`;
  } else {
    link += arrow;
  }
  if (doc.release) {
    link += `<span class="_list-count">${doc.release}</span>`;
  }
  link += `<span class="_list-text">${doc.name}`;
  if (options.fullName || (options.disabled && doc.version)) {
    link += ` ${doc.version}`;
  }
  return link + "</span></a>";
};

templates.sidebarType = (type) =>
  `<a href="${type.fullPath()}" class="_list-item _list-dir" data-slug="${
    type.slug
  }" tabindex="-1">${arrow}<span class="_list-count">${
    type.count
  }</span><span class="_list-text">${$.escape(type.name)}</span></a>`;

templates.sidebarEntry = (entry) =>
  `<a href="${entry.fullPath()}" class="_list-item _list-hover" tabindex="-1">${$.escape(
    entry.name,
  )}</a>`;

templates.sidebarResult = function (entry) {
  let addons =
    entry.isIndex() && app.disabledDocs.contains(entry.doc)
      ? `<span class="_list-enable" data-enable="${entry.doc.slug}">Enable</span>`
      : '<span class="_list-reveal" data-reset-list title="Reveal in list"></span>';
  if (entry.doc.version && !entry.isIndex()) {
    addons += `<span class="_list-count">${entry.doc.short_version}</span>`;
  }
  return `<a href="${entry.fullPath()}" class="_list-item _list-hover _list-result _icon-${
    entry.doc.icon
  }" tabindex="-1">${addons}<span class="_list-text">${$.escape(
    entry.name,
  )}</span></a>`;
};

templates.sidebarNoResults = function () {
  let html = ' <div class="_list-note">No results.</div> ';
  if (!app.isSingleDoc() && !app.disabledDocs.isEmpty()) {
    html += `\
<div class="_list-note">Note: documentations must be <a href="/settings" class="_list-note-link">enabled</a> to appear in the search.</div>\
`;
  }
  return html;
};

templates.sidebarPageLink = (count) =>
  `<span role="link" class="_list-item _list-pagelink">Show more\u2026 (${count})</span>`;

templates.sidebarLabel = function (doc, options) {
  if (options == null) {
    options = {};
  }
  let label = '<label class="_list-item';
  if (!doc.version) {
    label += ` _icon-${doc.icon}`;
  }
  label += `"><input type="checkbox" name="${doc.slug}" class="_list-checkbox" `;
  if (options.checked) {
    label += "checked";
  }
  return label + `><span class="_list-text">${doc.fullName}</span></label>`;
};

templates.sidebarVersionedDoc = function (doc, versions, options) {
  if (options == null) {
    options = {};
  }
  let html = `<div class="_list-item _list-dir _list-rdir _icon-${doc.icon}`;
  if (options.open) {
    html += " open";
  }
  return (
    html +
    `" tabindex="0">${arrow}${doc.name}</div><div class="_list _list-sub">${versions}</div>`
  );
};

templates.sidebarDisabled = (options) =>
  `<h6 class="_list-title">${arrow}Disabled (${options.count}) <a href="/settings" class="_list-title-link" tabindex="-1">Customize</a></h6>`;

templates.sidebarDisabledList = (html) =>
  `<div class="_disabled-list">${html}</div>`;

templates.sidebarDisabledVersionedDoc = (doc, versions) =>
  `<a class="_list-item _list-dir _icon-${doc.icon} _list-disabled" data-slug="${doc.slug_without_version}" tabindex="-1">${arrow}${doc.name}</a><div class="_list _list-sub">${versions}</div>`;

templates.docPickerHeader =
  '<div class="_list-picker-head"><span>Documentation</span> <span>Enable</span></div>';

templates.docPickerNote = `\
<div class="_list-note">Tip: for faster and better search results, select only the docs you need.</div>
<a href="https://trello.com/b/6BmTulfx/devdocs-documentation" class="_list-link" target="_blank" rel="noopener">Vote for new documentation</a>\
`;
app.templates.path = function (doc, type, entry) {
  const arrow = '<svg class="_path-arrow"><use xlink:href="#icon-dir"/></svg>';
  let html = `<a href="${doc.fullPath()}" class="_path-item _icon-${
    doc.icon
  }">${doc.fullName}</a>`;
  if (type) {
    html += `${arrow}<a href="${type.fullPath()}" class="_path-item">${
      type.name
    }</a>`;
  }
  if (entry) {
    html += `${arrow}<span class="_path-item">${$.escape(entry.name)}</span>`;
  }
  return html;
};
















































var init = function() {
  document.removeEventListener('DOMContentLoaded', init, false);

  if (document.body) {
    return app.init();
  } else {
    return setTimeout(init, 42);
  }
};

document.addEventListener('DOMContentLoaded', init, false);
