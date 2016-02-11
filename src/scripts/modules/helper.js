/**
 * This module is a utility/helper for the App.
 *
 * @param array | dependencies
 * @param function | callback
 */

"user strict";

define(['require', 'underscore', 'backbone'], function(require, _, Backbone){

    // A SIAF, with the window and document object aliased.
    return (function(w, d){    
        var Helper = {
            // A property to store state properties used in method invocation.
            state: {
            },
            /**
             * A method to extend an object with the Backbone.Events framework, providing methods to attaching and triggering custom events.
             * @param object | object
             * @return object
             */
            attachEventsFramework: function(object){
                return _.extend(object, Backbone.Events);
            },
            /**
             * A method to retrieve the string or numerical representation of a given index (again string or numerical). If assoc is specified the string value of the index will be retrieved, else the numerical value. E.g. For an assocative array, given an search index of 0 will retrieve the string value at that position.
             * @param array | array
             * @param mixed | search
             * @param bool | assoc
             * @return mixed
             */
            getIndex: function(array, search, assoc){
                // If we want the associative value.
                if(assoc){
                    // A variable to store the associative value.
                    var tmp = '';
                    // A variable acting as an internal counter.
                    var i = 0;
                    for(j in array){
                        // Store the associative value.
                        tmp = j;
                        // If the internal counter is equal to the numerical search index, break the loop and return.
                        if(i == search){
                            break;
                        }
                        // Increment the internal counter.
                        i++;
                    }
                }else{
                    // A variable to store the numerical value.
                    var tmp = 0;
                    for(j in array){
                        // If the string search value is equal to the associative index, break the loop and return.
                        if(search == j){
                            break;
                        }
                        tmp++;
                    }
                }
                return tmp;
            },
            /**
             * A public method to get the total length of a specific level of a multidimensional array.
             * @param array | array
             * @param int | target
             * @return int
             */
            getLength: function(array, target){
                return this._getLength(array, target);             
            },
            /**
             * A private method to the public counterpart.
             * @param array | array
             * @param int | target
             * @param int | level
             * @return int
             */
            _getLength: function(array, target, level){
                // If the current level has not yet been defined, initialise it.
                if(typeof level === 'undefined'){
                    level = 0;
                }
                // Initialise the length for the current item in the array.
                length = 0;
                // If the current item is not empty.
                if(array.length > 0){
                    // If the current level is equal to the target level, sum the total length for the current item.
                    if(target == level){
                        length += array.length;
                    }else{
                        // Increment the level.
                        level++;
                        // Iterate through the item's at this level.
                        for(i in array){
                            // Ensure the return value of the _getLength is part of the sum. As this is a nested function invocation, the inner function will always return back to the outer.
                            length += this._getLength(array[i], target, level);                            
                        }
                    }
                }
                // Return the length for the outer function invocation after the length sum for the target level has been returned.
                return length;
            },
            find: function(array, search){
                var result = _.where(array, search);
                if(result){
                    return result;
                }
                return false;
            },
            concatText: function(){
                return _.reduce.apply(this, [arguments, function(last, next){
                    return (next != "" && next.length > 1 ? last + "<br />" + next : last + '');
                }]);              
            },            
        };
        // Return the Helper object.
        return Helper;

    })(window, document);

});