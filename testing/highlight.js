// This function will load the language from the languages folder
// the languages folder, if not specified, should be in the same folder as the script
// The className is the class that will be added to all of the span tags, so that
// they can be found at a later date. The span tags will also have an extra class
// which is the label used in the language rules.
function loadSyntaxHighlightingByClass(className, languagesFolderPath) {
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
            language = classes[1];

            // Load the file from highlight folder and insert async
            ajaxGET(languagesFolderPath + language + ".json", function (response, passedElement) {
                var syntax = JSON.parse(response);
                result = insertSyntaxHighlighting(syntax, passedElement.innerHTML);
                if (result) {
                    passedElement.innerHTML = result;
                }
            }, element);
        }
    }
}

// This function will highlight any elements innerHTML using the regex
// objects elements given.
//This function is a helper function for the insertSyntaxHighlighting function.
function insertSyntaxHighlightingByClass(regexObject, className) {
    if (typeof className === "undefined") {
        className = "regex-highlight";
    }
    if (typeof regexObject === "undefined") {
        return false;
    }

    // Get the blocks with the correct class
    var codeBlocks = document.getElementsByClassName(className);
    var matchesArray = [];

    // Loop through the codeblocks and wrap the matches
    for (var i = 0; i < codeBlocks.length; i++) {
        var codeBlock = codeBlocks[i];
        var code = codeBlock.innerHTML;
        result = insertSyntaxHighlighting(regexObject, code);
        if (result) {
            codeBlock.innerHTML = result;
        }
    }
    return true;
}

// This function scans the page for a code block, parses the code block
// with all the different regexes that has been supplied to the function
function insertSyntaxHighlighting(regexObject, code, duplicateFunction) {
    if (!duplicateFunction) {
        duplicateFunction = function(a, b) {
            if (a.index == b.index) {
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
    }

    // Finds all of the matches and stores them into an array
    var matchesArray = getMatchesArrayFromRegex(code, regexObject, "regex-highlight");

    // Sort and remove latter matches so its top priority
    sortArrayByObjectsIndex(matchesArray);

    // Remove objects which are direct matches and if they are inside a wrapping
    // pattern match
    // < is remove left
    // > is remove right
    // 0 is dont remove
    removeDuplicateObjectsFromArray(matchesArray, duplicateFunction);

    // Return the new string with its matches wrapped in span tags
    return assembleNewStringFromMatchArray(code, matchesArray);
}

//
// UTILS
//
// This function will return all of the matches that an object which contains
// different regex patterns will match with a string
function getMatchesArrayFromRegex(string, regexObject, className) {
    var matchesArray = [];

    // Loop through the different regexes and store any matches into an array
    var counter = 1;
    for (var key in regexObject) {
        matchObject = regexObject[key];
        regexes = matchObject.regexes;

        // loop the individual regex
        for (var i = 0; i < regexes.length; i++) {

            // Match the syntax
            regex = regexes[i];
            var reg = new RegExp(regex, "gm");
            while (match = reg.exec(string)) {
                var index = match.index;
                var matchText = match[match.length-1]; // Get the last captured group
                if (typeof matchText == "undefined")
                    continue;

                // Save the results into an object/array
                object = {
                    "index": index,
                    "classes": className + " " + key,
                    "type": key,
                    "length": matchText.length,
                    "match": matchText
                }
                if (matchObject.precedence) {
                    object.precedence = matchObject.precedence;
                    counter--; // Stop incrementing if a precedence has been given
                }
                else {
                    object.precedence = counter;
                }
                matchesArray.push(object);
            }
        }
        counter++;
    }

    return matchesArray;
}

// Order the array passed by the index of the contained objects
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

// This function removes any duplicate items from an already sorted array
// It will always remove from the right.
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

// Assemble the new string where matches are wrapped in span tags with a new
// class attached to them
function assembleNewStringFromMatchArray(string, array) {
    var offset = 0;
    for (var i = 0; i < array.length; i++) {
        var match = array[i];
        var index = match.index;
        var classes = match.classes;
        var length = match.length;
        string = wrapTextWithSpan(string, index + offset, index + length + offset, classes);

        // Update the offset
        offset += ("<span class=''></span>" + classes).length;
    }
    return string;
}

// This function wraps some text at the start point to the end point
// with a span which has a class of syntaxType
function wrapTextWithSpan(text, start, end, classes) {

    // Get the text at different points
    var beginning = text.substring(0, start);
    var middle = text.substring(start, end);
    var ending = text.substring(end);

    // Wrap the match with a span
    return beginning + "<span class='" + classes + "'>" + middle + "</span>" + ending;
}

// This will make the AJAX call and make a call to callback. The bundle
// object is a package of data that will be sent to every callback without losing
// the meaning of what it contains due to async
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
