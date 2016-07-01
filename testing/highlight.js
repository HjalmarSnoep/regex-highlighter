/**
* A class for the Regex Highlighter
* @class
*/
var RegexHighlighter = function() {

    /**
    * Retrieves files and data via a HTTP GET call using the XMLHttpRequest
    * class. This function has support for a callback function when it is finished
    * as well as passing a bundle object back to the callback function when
    * everything is complete. This function is asynchronous!
    *
    *   @param {string} url - the url of the resource
    *   @param {function} [callback] - A callback to be made when the resource has
    *       been retrieved.
    *   @param {Object} [bundle] - A bundle object to be passed to the callback
    */
    function ajaxGET(url, callback, bundle) {
        var xhttp = new XMLHttpRequest();
        xhttp.onreadystatechange = function() {
            if(xhttp.readyState == 4 && xhttp.status == 200) {
                callback(xhttp.responseText, bundle);
            }
        }
        xhttp.open("GET", url, true);
        xhttp.send();
    }

    /**
    * A function to sort the values of the passed in array, first by their indicies
    * then by their precedence.
    *
    *   @param {Object[]} array - Array of regex match objects
    */
    function sortArrayByObjectsIndex(array) {
        array.sort(function compareObj(a, b) {
            if (a.index == b.index) {
                if (a.precedence == b.precedence) {
                    return 0;
                }
                else {
                    return a.precedence - b.precedence;
                }
            }
            else {
                return a.index - b.index;
            }
        });
    }

    /**
    * Remove duplicate objects from the array using a function passed into this
    * function. The array should contain Regex match objects and the shouldRemove
    * function should work in a similar way to a compare function in most
    * imperative languages. This means that <0 will remove the item on the left,
    * >0 will remove the item on the right. 0 will not remove anything
    *
    *   @param {Object[]} array - The array which will have its duplicate items
    *       removed from
    *   @param {function} shouldRemove - A callback function to decide what will be removed
    */
    function removeDuplicateObjectsFromArray(array, shouldRemove) {
        for (var i = 1; i < array.length; i++) {
            var side = shouldRemove(array[i-1], array[i]);
            if (side != 0) {
                if (side < 0) {
                    array.splice(i-1, 1);
                    i--;
                }
                else {
                    array.splice(i, 1);
                    i--;
                }
            }
        }
    }

    /**
    * Produces a string which contains the new highlighting, by wrapping matches
    * in the passed array in a span tag with the corresponding class. In order
    * to make sure this functions correctly, it uses an offset and a pre-built
    * match array. When actually wrapping a match with a span, the method
    * {@link wrapTextWithSpan} is used.
    *
    *   @param {string} string - The string which will be highlighted via the
    *       match array
    *   @param {Object[]} array - The array which contains all the match information
    */
    function assembleNewStringFromMatchArray(string, array) {
        var offset = 0;
        for (var i = 0; i < array.length; i++) {
            var match = array[i];
            var index = match.index;
            var classes = match.classes;
            var length = match.length;
            string = wrapTextWithSpan(string, classes, index + offset, index + length + offset);

            // Update the offset
            offset += ("<span class=''></span>" + classes).length;
        }
        return string;
    }

    /**
    * Wraps a given piece of text with a span tag that has a class.
    *
    *   @param {string} text - The text as a whole
    *   @param {string} [classes] - The classes to give the wrapping
    *   @param {number} [start] - The start point of the wrapping
    *   @param {number} [end] - The end point of the wrapping
    */
    function wrapTextWithSpan(text, classes, start, end) {
        if (typeof classes === "undefined") {
            classes = "";
        }
        if (typeof start === "undefined") {
            start = 0;
        }
        if (typeof end === "undefined") {
            end = text.length;
        }

        // Get the text at different points
        var beginning = text.substring(0, start);
        var middle = text.substring(start, end);
        var ending = text.substring(end);

        // Wrap the match with a span
        return beginning + "<span class='" + classes + "'>" + middle + "</span>" + ending;
    }

    /**
    * This function will return all of the matches that an object which contains
    * different regex patterns will match with a string
    *
    *   @param {Object} regexObject - This is the object which contains all of
    *       the regex information. It can be loaded from a file, see JSON
    *       examples for how to create these.
    *   @param {string} string - This is the text that needs to be converted to
    *       its highlighted form
    *   @param {string} [returnClassName] - This is the class name that will be
    *       given to the span tags in order to identify the output matches.
    */
    function getMatchesArrayFromRegex(regexObject, string, returnClassName) {
        var matchesArray = [];

        // Loop through the different regexes and store any matches into an array
        var counter = 1;
        for (var type in regexObject) {
            var matchObject = regexObject[type];
            var regexes = matchObject.regexes;

            // loop the individual regex
            for (var i = 0; i < regexes.length; i++) {
                regex = regexes[i];
                var reg = new RegExp(regex, "gm");
                while (match = reg.exec(string)) {
                    var index = match.index;
                    var matchText = match[match.length-1]; // Get the last captured group
                    if (typeof matchText == "undefined")
                        continue;

                    // Check if the precedence option has been set in the syntax
                    var precidence;
                    if (matchObject.precedence) {
                        if (isNaN(matchObject.precedence)) {
                            var found = false;
                            for (var i = 0; i < matchesArray.length; i++) {
                                if (matchObject.precedence ==  matchesArray[i].type) {
                                    precedence = matchesArray[i].precedence;
                                    counter--; // Cancel increment this turn
                                    found = true;
                                    break;
                                }
                            }
                            if (!found)
                                precedence = counter;
                        }
                        else {
                            precedence = parseInt(matchObject.precedence);
                            counter--;
                        }
                    }
                    else
                        precedence = counter;

                    // Save the results into an object array
                    object = {
                        "index": index,
                        "classes": returnClassName + " " + type,
                        "type": type,
                        "length": matchText.length,
                        "match": matchText,
                        "precedence": precedence
                    }
                    matchesArray.push(object);
                }
            }
            counter++;
        }
        return matchesArray;
    }

    /**
    * Default duplicate function for the {@link insertSyntaxHighlighting} function
    *
    *   @param {Object} a - This is the left regex match
    *   @param {Object} b - This is the right regex match
    */
    function defaultDuplicateFunction(a, b) {
        if (a.index == b.index) {
            if (a.precidence == b.precidence) {
                if (a.length == b.length)
                    return -1;
                else
                    return a.length - b.length;
            }
            else
                return a.precidence - b.precidence;
        }
        // If b completely contained within a, remove b
        else if (b.index > a.index && (b.index + b.length) < (a.index + a.length)) {
            return 1;
        }
        // If b starts inside a, but continues past the end of a
        else if (b.index > a.index && b.index < a.index + a.length &&
                (b.index + b.length) >= (a.index + a.length)) {
            if (a.precidence != b.precidence) {
                return a.precidence - b.precidence;
            }
            else if (a.length != b.length) {
                return a.length - b.length
            }
            else {
                return -1;
            }
        }
        return 0;
    }

    /**
    * This function inserts the span tags into the string and returns a new string
    * which can be added to the page or printed to console. This is the main function
    * for where all of the sub functions are called. As well as where the main duplicateFunction
    * is defined if one is not passed in.
    *
    *   @param {Object} regexObject - This is the object which contains all of
    *       the regex information. It can be loaded from a file, see JSON examples
    *       for how to create these.
    *   @param {string} string - This is the text that needs to be converted to
    *       its highlighted form.
    *   @param {string} [returnClassName] - This is the class name that will be
    *       given to span tags in order to identify the output matches.
    *   @param {function} [duplicateFunction] - This is the function which will be
    *       used to remove any duplicate matches from the highlighting.
    */
    this.insertSyntaxHighlighting = function(regexObject, string, returnClassName, duplicateFunction) {
        if (typeof returnClassName === "undefined") {
            returnClassName = "regex-highlight";
        }
        if (typeof duplicateFunction === "undefined") {
            duplicateFunction = defaultDuplicateFunction;
        }

        // Finds all of the matches and stores them into an array
        var matchesArray = getMatchesArrayFromRegex(regexObject, string, returnClassName);

        // Sort and remove latter matches so its top priority
        sortArrayByObjectsIndex(matchesArray);

        // Remove objects which are direct matches and if they are inside a wrapping
        // pattern match
        // < is remove left
        // > is remove right
        // 0 is dont remove
        removeDuplicateObjectsFromArray(matchesArray, duplicateFunction);

        // Return the new string with its matches wrapped in span tags
        return assembleNewStringFromMatchArray(string, matchesArray);
    }

    /**
    * Loads elements from the document via a className like the
    * {@link loadSyntaxHighlightingByClass} but this function will use a
    * regexObject directly from code, instead of loading one from a directory.
    * If no className is given to load the elements, then it will use the
    * default of 'regex-color'.
    *
    *   @param {string} regexObject - This is the object that will be used to
    *       highlight the text page elements need to be highlighted.
    *   @param {string} [className] - This is the className that will be used
    *       to identify what elements on the page need to be highlighted
    */
    this.insertSyntaxHighlightingByClass = function(regexObject, className) {
        if (typeof regexObject === "undefined") {
            return false;
        }
        if (typeof className === "undefined") {
            className = "regex-color";
        }

        // Get the blocks with the correct class
        var codeBlocks = document.getElementsByClassName(className);
        var matchesArray = [];

        // Loop through the codeblocks and wrap the matches
        for (var i = 0; i < codeBlocks.length; i++) {
            var codeBlock = codeBlocks[i];
            var code = codeBlock.innerHTML;
            result = this.insertSyntaxHighlighting(regexObject, code);
            if (result) {
                codeBlock.innerHTML = result;
            }
        }
        return true;
    }

    /**
    * The main function to add regex-highlighting to any element on the page. The
    * elements will be loaded by a class supplied to the function, then they will
    * have their innerHTML highlighted by inserting span tags with the the default
    * class of 'regex-color'. The regex languages will be searched for in the specified
    * languagesFolderPath variable, if no path is given, then the default path will be
    * './languages/'.
    *
    *   @param {string} [className] - The className that will be used to identify which
    *       page elements need to be highlighted.
    *   @param {string} [languagesFolderPath] - This is the path to the languages
    *       folder, so that any languages that can be used, will be found
    */
    this.loadSyntaxHighlightingByClass = function(className, languagesFolderPath) {
        if (typeof languagesFolderPath === "undefined") {
            languagesFolderPath = "languages/";
        }
        if (typeof className === "undefined") {
            className = "regex-color";
        }
        var elements = document.getElementsByClassName(className);

        // Get the second class as it should be the language name
        for (var i = 0; i < elements.length; i++) {
            var element = elements[i];
            var classes = element.className.split(" ");
            if (classes.length > 1) {
                var language = classes[1];

                // Load the file from highlight folder and insert async
                ajaxGET(languagesFolderPath + language + ".json", function (response, passedElement) {
                    var syntax = JSON.parse(response);
                    var result = new RegexHighlighter().insertSyntaxHighlighting(syntax, passedElement.innerHTML);
                    if (result) {
                        passedElement.innerHTML = result;
                    }
                }, element);
            }
        }
    }
}
