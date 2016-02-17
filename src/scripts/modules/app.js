/**
 * This module is the primary entry point for the App. It primarily handles UI display and interaction.
 *
 * @param array | dependencies
 * @param function | callback
 */

"use strict";

define(['require', 'helper.min', 'loader.min', 'jquery', 'libs/jquery.idle/jquery.idle.min'], function(require, helper, loader, $){

    // A SIAF, with the window and document objects aliased.
    (function(w, d){    

        var App = {
            // A property to cache DOM elements - rows, and images and snippets.
            cache: {
                elements: [],
                images: [],        
                snippets: [],        
            },
            // A property to store state information, specific to the rendering process and active items.
            state: {
                total: 0,
                rendered: [],
                items: [],
                animations: [],
                width: 0,
                animating: false,
            },
            // A property to store the resources path, used as a prefix for referencing resources, namely images and XML.
            resourcesPath: '',
            // A property to store the interfaces path, used as a prefix for referencing an interface, namely resizing and cropping images on the fly.
            interfacesPath: '',

           /**
            * A method to initialise the App.
            * @return undefined
            */
            init: function(){
                var self = this;
                // Set the resources path dynamically, environment independent.
                self.resourcesPath = w.location.href + 'dist/assets';
                // Set the interfaces path dynamically, environment independent.                
                self.interfacesPath = w.location.href + 'interfaces';
                // Store jQuery object references to the interactive elements to be populated. 
                // The top and bottom rows are appended to the cache under index 0.
                self.cache.elements.push($('.row').not('#middle'));
                // The middle row is appended to the cache under index 1.
                self.cache.elements.push( $('.row').filter('#middle'));
                // Extend the Loader and App object with the Backbone.Events framework.
                helper.attachEventsFramework(loader);
                helper.attachEventsFramework(self);
                // Attach a custom event indicating a change in state. 
                // The XML files have been loaded and parsed.
                self.listenToOnce(loader, 'xmlReady', $.proxy(self.renderItems, self));
                // The items have been added to the DOM.          
                self.listenToOnce(self, 'renderReady', $.proxy(self.attachEvents, self));
                // The item has been mouse-entered and the image has been loaded, therefore the item can be expanded.
                self.listenTo(self, 'expandItem', $.proxy(self.expandItem, self));      
                // The item has been mouse-left, therefore the item can be contracted.
                self.listenTo(self, 'contractItem', $.proxy(self.contractItem, self));  
                // The item has been expanded fully, therefore the information/icon can be shown.
                self.listenTo(self, 'showInfo', $.proxy(self.showInfo, self));         
                // The item has been contracted fully, therefore the information/icon can be hidden.
                self.listenTo(self, 'hideInfo', $.proxy(self.hideInfo, self));   
                // The item has been expanded fully, therefore the need to scroll can be determined, if true the horizontal scroll is adjusted.
                self.listenTo(self, 'scrollTo', $.proxy(self.scrollTo, self));                                                         
                // Initialise the XML load (initial trigger for other events).
                loader.fetch([self.resourcesPath + '/xml/xml1.xml', self.resourcesPath + '/xml/xml2.xml'], {});
            },

            /**
             * A method to build/render the interface for the interactive elements. This method is triggered using the custom event xmlReady, within the Loader object.
             * @return undefined
             */
            renderItems: function(results){
                // Always maintain a reference to the current object.
                var self = this; 
                // If the results array, keyed by row index is not empty.               
                if(results.length > 0){
                    // Create a deferreds array to hold the render state for each item.
                    var deferreds = [];
                    // Set the total state, reflecting the total number of items across all rows.
                    self.state.total = helper.getLength(results, 1);
                    // Set the width of each slice relative to the total number of items divided by the total number of rows.
                    self.state.width = ((self.state.total / results.length) / 100);
                    // Iterate through the results array, keyed by row index (rows).
                    $.each(results, function(row, result){
                        var row = parseInt(row);
                        var rowElement = $(self.cache.elements[0][row]);
                        // Attach a native DOM event to the current row, triggered upon insertion of every item.
                        rowElement.on('DOMNodeInserted', '.item', $.proxy(self.itemRendered, self));
                        // Iterate through the results within each row index, keyed by item index (items).
                        for(id in result){
                            var id = parseInt(id);
                            // Create a new deffered object for the item.
                            var deferred = $.Deferred();
                            var deferredState = {
                                row: row,
                                id: id,
                                deferred: deferred,
                            };
                            // The deferred object is added to the rendered property in the state array. The reason being that it needs to be referenced outside of this method upon the insertion of the item, which in turn resolves the deferred object.
                            self.state.rendered.push(deferredState);      
                            // In addition it is appended to a local array to be used within the $.when jQuery method, triggered when all deferreds are resolved.
                            deferreds.push(deferred);              
                            var properties = results[row][id];
                            // Create a new item element.
                            var itemElement = $('<div></div>', {
                                class: 'item',
                                id: row + '-item-' + id,
                            });
                            // Get the image paths for the item, reflecting the image variations (original and cropped).
                            var imgPaths = self.buildImagePaths(properties['media']);
                            var imgState = {
                                row: row,
                                id: id,
                                paths: imgPaths,
                            };
                            // Append the paths to the images state property, keyed by row and index.
                            self.cache.images.push(imgState);
                            var snippetState = {
                                row: row,
                                id: id,
                                content: properties['snippet'],
                            };
                            // Append the snippet to the snippets state property, keyed by row and index.                            
                            self.cache.snippets.push(snippetState);                     
                            itemElement.css({
                                'background': 'transparent url(' + imgPaths[1] + ') 0 0 no-repeat',
                                'background-size': 'contain',
                                'width': self.state.width + '%',
                            });
                            var imgElement = $('<img />', {
                                class: 'img',
                                src: imgPaths[1],
                            });
                            var infoElementWrapper = $('<div></div>', {
                                class: 'info',
                            }); 
                            var iconAreaElement = $('<a class="icon" href="#"><img src="' + self.resourcesPath + '/images/info.png' + '" /></a>');
                            // Concatenate the necessary information using selective properties under the item node.                            
                            var info = helper.concatText(properties['building'], properties['location'], 'Architect: ' + properties['architect'], properties['date'], 'Photo: ' + properties['credit']);                            
                            var infoElement = $('<div></div>', {
                                class: 'text',
                            }).html(info);
                            infoElementWrapper.append(iconAreaElement, infoElement);                    
                            rowElement.append(itemElement.append(imgElement, infoElementWrapper));
                        }
                    });      
                    $.when.apply(self, deferreds).done($.proxy(function(){                     
                        this.clearState('rendered', []);
                        this.trigger('renderReady');
                    }, self));              
                }
            },

            /**
             * A method to perform validation prior to executing the action. Primarily ensuring the active item is not already active, and that all 'other' item's are inactive.
             * @param int | id
             * @param object | item
             * @param string | state
             * @return bool
             */
            validate: function(id, item, state)
            {   
                var self = this;
                switch(state){
                    case 'enter':
                        if(item.hasClass('active')){
                            return false;
                        }
                        // Ensure's no other item's except the current item is active at any one time. Solves the issue when transitioning sporadically from animation to manual interaction.
                        var items = self.getItems(false, '.active');
                        if(items.length > 0){
                            $.each(items, function(i, v){
                                var v = $(v);                           
                                if(self.getItemId(v) != id){
                                    v.trigger('mouseleave');
                                }
                            });
                        }
                        break;
                    case 'leave':
                        if(!item.hasClass('active')){
                            return false;
                        }
                        break;
                }
                return true;
            },

            /**
             * A method to attach events to the interactive elements, this method is triggered using the custom event 'renderReady'.
             * @return undefined
             */
            attachEvents: function(){
                // Always maintain a reference to the current object.                
                var self = this;
                // Iterate through the cached elements, reflecting all rows other than the middle.
                $.each(self.cache.elements[0], function(i, row){
                    // Get all items within the row.
                    var items = $(row).find('.item');
                    if(items.length > 0){
                        items.on({
                            'mouseenter click': function(event){                            
                                // Get the current item.
                                var item = $(this);
                                // Get the row id, relative to the current item.
                                var row = self.getItemRowId(item);
                                // Get the current item id.
                                var id = self.getItemId(item);
                                // Define a new animation id (row + id) to index the animation for the current item.
                                var animationId = row + ':' + id;                                
                                // Get the image, relative to the current item.
                                var img = item.find('.img');  
                                // Perform validation prior to initiating the action.
                                if(self.validate(id, item, 'enter')){
                                    // Switch the current item's class to active.
                                    item.attr('class', 'item active');   
                                    // Stop any currently running animations.
                                    item.stop(true);                                                                                                                           
                                    try{
                                        // Get the adjacent inactive item's across all rows.
                                        var altItem = self.getItems(id, '.active', true)[0];
                                        // Trigger the same behaviour on the adjacent item's.
                                        if(altItem){
                                            $(altItem).trigger('mouseenter');
                                        }
                                        // Get the original image path from the cached images array, searchable using the current item's id and row id. 
                                        var images = helper.find(self.cache.images, { row: row, id: id })[0];
                                        if(images){
                                            // Switch the current item's image path to the original.
                                            var imgPath = images.paths[0];
                                            img.attr('src', imgPath);  
                                            // Create a new object to store the animation state information, and index it by the animation id.                                                                
                                            self.state.animations[animationId] = {
                                                timestamp: 0,
                                            };
                                            // Initiate the animation (interim method to expandItem), and store the returned request frame id for reference later.                                             
                                            var requestFrameId = w.requestAnimationFrame($.proxy(self.detectImage, self, id, row, item, img));  
                                            if(requestFrameId){
                                                self.state.animations[animationId].id = requestFrameId;
                                            }                                                      
                                        }
                                    }catch(error){}
                                }
                            },  
                            mouseleave: function(event){
                                // Get the current item.
                                var item = $(this);
                                // Get the row id, relative to the current item.
                                var row = self.getItemRowId(item);
                                // Get the current item id.
                                var id = self.getItemId(item);
                                // Define a new animation id (row + id) to index the animation for the current item.
                                var animationId = row + ':' + id;        
                                // Get the image, relative to the current item.                           
                                var img = item.find('.img');     
                                // Perform validation prior to initiating the action.
                                if(self.validate(id, item, 'leave')){
                                    // Switch the current item's class to inactive.
                                    item.attr('class', 'item');                                
                                    // Stop any currently running animations.                                                                              
                                    item.stop(true);         
                                    // Hide any active info - precaution for touch devices where mouse hasn't been activated on alternate item during animation.
                                    item.find('.info').trigger('info:hide');
                                    try{
                                        // Get the adjacent active item's across all rows.
                                        var altItem = self.getItems(id, '.active', false)[0];
                                        // Trigger the same behaviour on the adjacent item's.
                                        if(altItem){
                                            $(altItem).trigger('mouseleave');
                                        }        
                                        // If the animation state exists.
                                        if(self.state.animations[animationId]){
                                            // Cancel the animation, regardless of whether it is active or not.
                                            w.cancelAnimationFrame(self.state.animations[animationId].id);
                                            // Reset the state of the stored animation.
                                            self.state.animations[animationId] = {
                                                id: 0,
                                                timestamp: 0,
                                            };      
                                            // Trigger the item's contraction.
                                            self.trigger('contractItem', id, row, item, img);                                                                             
                                        }                                                                                                                    
                                    }catch(error){}    
                                }
                            },
                        });
                        // Attach a mouseenter event to the icon, nested within the item (applied across all item's for the current row).
                        items.find('.icon').on({
                            mouseenter: function(event){
                                // Get the current icon.
                                var icon = $(this);
                                // Get the item, relative to the current icon.
                                var item = icon.parents('.item');
                                // Get the id of the current item.
                                var id = self.getItemId(item);
                                // Get all item's that are currently active (including self). 
                                var items = self.getItems(id, '', false);
                                if(items.length > 0){
                                    // Display the info for each item.
                                    $.each(items, function(i, item){
                                        var item = $(item);
                                        item.find('.info').find('.text').show().end().attr('class', 'info active');
                                    });
                                }
                            },
                            click: function(event){
                                event.preventDefault();
                            },
                        });
                        // Attach a mouseleave event to the info, nested within the item (applied across all item's for the current row).
                        items.find('.info').on({
                            mouseleave: function(event){
                                // Get the current info.
                                var info = $(this);
                                // Get the item, relative to the current info.
                                var item = info.parents('.item');
                                // Get the id of the current item.
                                var id = self.getItemId(item);
                                // Get all item's that are currently active (including self). 
                                var items = self.getItems(id, '', false);
                                if(items.length > 0){
                                    // Hide the info for each item.
                                    $.each(items, function(i, item){
                                        var item = $(item);
                                        item.find('.info').find('.text').hide().end().attr('class', 'info');
                                    });
                                }
                            },
                            'info:hide': function(event){
                                // Get the current info.
                                var info = $(this);
                                // Get the item, relative to the current info.
                                var item = info.parents('.item');
                                // Get the id of the current item.
                                var id = self.getItemId(item);
                                // Get all item's that are currently active (including self). 
                                var items = self.getItems(id, '', false);
                                if(items.length > 0){
                                    // Hide the info for each item.
                                    $.each(items, function(i, item){
                                        var item = $(item);
                                        item.find('.info').find('.text').hide().end().attr('class', 'info');
                                    });
                                }
                            },
                        });
                    }
                });

                var idle = false,
                mouseX = 0,
                mouseY = 0;

                /**
                 * An event handler to track mouse movement, added to prevent false firing when automating the scroll during animation.
                 * @param object | event
                 */
                $(document).on('mousemove click touchstart', function(event){
                    // Ensure to negate any offset triggered from scrolling.   
                    var x = (event.pageX - window.pageXOffset);
                    var y = event.pageY;
                    // Compare the previous capture to the current, they should never be the same unless the animation for app is active and the mousemove event is triggered by the autoscroll.
                    if(x != mouseX
                        || y != mouseY){
                        mouseX = x;
                        mouseY = y;   
                        idle = false; 
                    }else{
                        idle = true;
                    }                
                });

                // Define a local variable to hold the request animation frame id, relative to the idle event handler.
                var animationId = 0;
                // Define a local variable to reference the middle row.
                var row = $(self.cache.elements[1]);                
                // Attach on-idle event.
                $(document).idle({
                    onIdle: function(){  
                        // Set a flag to indicate the animation is running.
                        self.state.animating = true;
                        // Define a variable to store the initial timestamp.
                        var init = 0;
                        // Define a function to be called for each animation frame.
                        var animation = function(timestamp){
                            try{
                                // Set the initial timestamp.
                                if(init == 0){
                                    init = timestamp;
                                }
                                // Calculate the difference in milliseconds, between the current timestamp and the initial.
                                var diff = (timestamp - init);
                                // If the different is less than 5 seconds, invoke 'this' again.
                                if(diff < 10000){
                                    // Update the request animation frame id.
                                    animationId = w.requestAnimationFrame(animation);
                                }else{                                         
                                    // Else if an active item exists, manually trigger the mouseleave event on the item to contract it.                                                                   
                                    var prev = self.getItems(false, '.active')[0];
                                    if(prev){
                                        $(prev).trigger('mouseleave');
                                    }             
                                    var max = (self.state.total / self.cache.elements[0].length);
                                    var min = 0;
                                    // Generate a random id within a range.
                                    var id =  (Math.floor(Math.random() * (max - min)) + min);
                                    // Get the item using the randomly generated id.
                                    var item = self.getItems(id)[0];
                                    // Manually trigger the mouseenter event on the item.
                                    item.trigger('mouseenter');
                                    // Cancel the animation, and reset the initial timestamp.
                                    w.cancelAnimationFrame(animationId);                                
                                    init = 0;
                                    // Start the process all over again.
                                    animationId = w.requestAnimationFrame(animation);
                                }
                            }catch(error){}
                        }
                        // An initial trigger for the animation.
                        animationId = w.requestAnimationFrame(animation);
                        // Switch the headings.
                        row.find('h1').attr('class', 'inactive').end().find('h2').attr('class', '');
                    },
                    onActive: function(){ 
                        console.log(idle);
                        if(idle){
                            return;
                        }
                        try{
                            // If an active item exists, manually trigger the mouseleave event on the item to contract it.                            
                            var prev = self.getItems(false, '.active')[0];
                            if(prev){
                                $(prev).trigger('mouseleave');
                            }                                
                        }catch(error){}
                        // Set a flag to indicate the animation has stopped.
                        self.state.animating = false;
                        // Cancel the animation.
                        w.cancelAnimationFrame(animationId);     
                        // Switch the headings.
                        row.find('h1').attr('class', '').end().find('h2').attr('class', 'inactive');                                           
                    },        
                    idle: 60000,
                    events: 'mousemove touchstart',
                });   
            },

            /**
             * An intermediary method to ensure the primary image to be displayed within an item is completely loaded prior to being revealed.
             * @param int | id
             * @param int | row 
             * @param object | item
             * @param object | img
             * @param int | timestamp
             */
            detectImage: function(id, row, item, img, timestamp){
                // Always maintain a reference to the current object.
                var self = this;           
                // Define the animation id in it's expected format (@see mousenter event for item).
                var animationId = row + ':' + id;
                // Set the initial timestamp.
                if(self.state.animations[animationId].timestamp == 0){
                    self.state.animations[animationId].timestamp = timestamp;
                } 
                 // Calculate the difference in milliseconds, between the current timestamp and the initial.
                var diff = (timestamp - self.state.animations[animationId].timestamp);
                // Determine whether the image has been completely loaded.
                var complete = img.prop('complete');
                // If the different is less than 2 seconds, and the image has not yet loaded, invoke 'this' again.
                if(diff < 2000
                    && !complete){
                    var requestFrameId = w.requestAnimationFrame($.proxy(self.detectImage, self, id, row, item, img));
                    if(requestFrameId){
                        self.state.animations[animationId].id = requestFrameId;
                    }
                // Else trigger the item's expansion.
                }else if(complete){
                    self.trigger('expandItem', id, row, item, img);
                }
            },

            /**
             * A method to expand an item.
             * @param int | id
             * @param int | row 
             * @param object | item
             * @param object | img
             */            
            expandItem: function(id, row, item, img){          
                // Always maintain a reference to the current object.             
                var self = this;
                try{          
                    // Get the image width.
                    var imgWidth = img.width();
                    // Get the window width.
                    var windowWidth = $(w).width();
                    // Calculate item's width as a percent, relative to the window width.
                    var itemWidthPercent = ((imgWidth / windowWidth) * 100);  
                    // Animate the expansion.              
                    item.animate({
                        width: itemWidthPercent + '%',
                    }, { duration: 2000, complete: function(){                 
                        var init = self.state.items.indexOf(id);
                        // Functions that only need to be executed once upon animation completion with each pair of items.                        
                        if(init < 0){
                            self.state.items.push(id);
                        // Else last item is being expanded.
                        }else{
                            // If the application is currently being animated, perform the autoscroll if required.
                            if(self.state.animating){
                                self.trigger('scrollTo', id);
                            }
                        }
                        // Functions that are executed on each animation completion.
                        self.trigger('showInfo', item);
                    }});
                }catch(error){}
            },

            /**
             * A method to contract an item.
             * @param int | id
             * @param int | row 
             * @param object | item
             * @param object | img
             */       
            contractItem: function(id, row, item, img){
                // Always maintain a reference to the current object.                
                var self = this;                                       
                try{
                    // Animate the contraction.
                    item.animate({
                        width: self.state.width + '%',
                    }, { duration: 2000, complete: function(){  
                        var init = self.state.items.indexOf(id);
                        // Functions that only need to be executed once upon animation completion with each pair of items.                           
                        if(init > -1){
                            self.state.items.splice(init, 1);
                        }
                        // Get the cropped image path from the cached images array, searchable using the current item's id and row id. 
                        var images = helper.find(self.cache.images, { row: row, id: id })[0];
                        if(images){
                            // Switch the current item's image path to the cropped.
                            var imgPath = images.paths[1];
                            img.attr('src', imgPath);                            
                        }
                        // Functions that are executed on each animation completion.                        
                        self.trigger('hideInfo', item);                        
                    }});
                }catch(error){}
            },

            /**
             * A method to alter the scroll position of the window.
             * @param int | id
             */       
            scrollTo: function(id){
                // Always maintain a reference to the current object.                   
                var self = this;
                // Get the window width.
                var windowWidth = $(w).width();
                // Get the outer most document width.
                var documentWidth = $(d).outerWidth();
                // Get any page offset (x), if applicable.
                var pageXOffset = $(w).prop('pageXOffset');
                // Get the currently active item's.
                var items = self.getItems(id, '.active');
                // Define a variable to store the maximum item width.
                var itemWidth = 0
                // Define a variable to store the left offset position for any of the active item's (adjacent item's have the same value).
                var itemLeftPos = 0;
                if(items.length > 0){
                    // Iterate through the active item's.
                    $.each(items, function(i, item){
                        var item = $(item);
                        var width = item.find('.img').width();
                        // Set the left offset position.
                        itemLeftPos = item.position().left;
                        // If the current item's width is greater than the maximum set, update the value.
                        if(width > itemWidth){
                            itemWidth = width;
                        }
                    });
                    // Determine whether the scroll position needs to be adjusted (positively).
                    var scrollTo = (((itemLeftPos + itemWidth) > (pageXOffset + windowWidth)) ? true : false);
                    if(scrollTo){
                        // Calculate the different between the current scroll position and the adjustment.
                        var scrollToDiff = ((itemLeftPos + itemWidth) - (pageXOffset + windowWidth));
                        // Animate the document scroll.
                        $('html, body').animate({
                            scrollLeft: '+=' + scrollToDiff + 'px',
                        }, { duration: 1000 });
                    }else{
                        // Determine whether the scroll position needs to be adjusted (negatively).
                        var scrollFrom = ((pageXOffset > itemLeftPos) ? true : false);
                        if(scrollFrom){
                            var scrollFromDiff = (pageXOffset - itemLeftPos);
                            // Animate the document scroll.
                            $('html, body').animate({
                                scrollLeft: '-=' +  scrollFromDiff + 'px',
                            }, { duration: 1000 });            
                        }            
                    }
                }
            },

            /**
             * A method to show the icon of an item.
             * @param object | item
             */       
            showInfo: function(item){
                var icon = item.find('.icon');
                icon.show();
            },

            /**
             * A method to hide the icon of an item.
             * @param object | item
             */      
            hideInfo: function(item){
                var icon = item.find('.icon');
                icon.hide();
            },

            /**
             * A method to filter the interactive items by an id and selector.
             * @param int | id
             * @param string | selector
             * @param bool | inverse
             */
            getItems: function(id, selector, inverse){
                var self = this;
                // A variable to store the items.
                var items = [];               
                $.each(self.cache.elements[0], function(i, row){
                    var item;
                    // // If the inverse parameter is false, get the item's that match the selector.
                    if(!inverse){
                        if(id
                            || typeof id === 'number'){
                            item = $(row).find('.item[id$="-' + id + '"]');
                        }else{
                            item = $(row).find('.item');
                        }
                        if(selector){
                            item = item.filter(selector);
                        }
                    }else{
                        // If the inverse parameter is true, get the item's that don't match the selector.
                        if(id
                            || typeof id === 'number'){
                            item = $(row).find('.item[id$="-' + id + '"]');
                        }else{
                            item = $(row).find('.item');
                        }
                        if(selector){
                            item = item.not(selector);
                        }                                    
                    }
                    // // If there are items in the row that match, append them to the item's array.
                    if(item.length > 0){
                        items.push(item);
                    }
                });          
                return items; 
            },          

            /**
             * A method acting as a callback for the native window event 'DOMNodeInserted'.
             * @param object | event
             */
            itemRendered: function(event){
                // Always maintain a reference to the current object.
                var self = this;
                // Get the current item.
                var item = event.target;
                // Get the row id for the current item.
                var row = self.getItemRowId(item);
                // Get the id for the current item.
                var id = self.getItemId(item);
                if(typeof row === 'number'
                    && typeof id === 'number'){
                    // Get the deferred object for the current item and resolve it.
                    var deferred = helper.find(self.state.rendered, { row: row, id: id });
                    if(deferred.length > 0){
                        deferred[0].deferred.resolve();
                    }
                }
            },

            getItemId: function(item){
                try{
                    var id = $(item).attr('id');
                    var regex = /\d+$/;
                    var match = id.match(regex);
                    if(match.length > 0){
                        return parseInt(match[0]);
                    }
                }catch(error){}
                return false;
            },

            getItemRowId: function(item){
                try{
                    var id = $(item).attr('id');
                    var regex = /^\d+/;
                    var match = id.match(regex);
                    if(match.length > 0){
                        return parseInt(match[0]);
                    }
                }catch(error){}
                return false;
            },            

            clearState: function(name, value){
                var self = this;
                if(typeof self.state[name] !== 'undefined'){
                    self.state[name] = value;
                }
            },

            /**
             * A method to build the image path variations for a passed image.
             * @param string | imgPath
             * @return array | paths
             */
            buildImagePaths: function(imgPath){
                // A variable defining the image path variations. Each of which references the CImage PHP library interface.
                var paths = [
                    this.interfacesPath + '/img.php?' + 'src=/' + imgPath + '&h=' + 600,
                    this.interfacesPath + '/img.php?' + 'src=/' + imgPath + '&h=' + 600 + '&crop-to-fit&a=' +  0 + ',' + 75 + ',' + 0 + ',' + 0,
                ];
                // Iterate through the image paths, creating a blank jQuery object for an image as a preloading mechanism.
                for(i = 0; i < paths.length; i++){
                    var img = $('<img />', {
                        src: paths[i],
                    });
                }
                return paths;
            },

        };
        App.init();

    })(window, document);

});