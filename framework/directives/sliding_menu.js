/*
Copyright 2013 ASIAL CORPORATION, KRUY VANNA, HIROSHI SHIKATA

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

*/


(function() {
	'use strict';
	var directives = angular.module('onsen.directives'); // no [] -> referencing existing module

	directives.directive('onsSlidingMenu', function(ONSEN_CONSTANTS, $http, $compile) {
		return {
			restrict: 'E',
			replace: false,
			transclude: false,
			scope: {
				behindPage: '@',
				abovePage: '@'
			},
			templateUrl: ONSEN_CONSTANTS.DIRECTIVE_TEMPLATE_URL + '/sliding_menu.tpl',
			link: function(scope, element, attrs) {
				var MAIN_PAGE_RATIO = 0.9;

				scope.ons = scope.ons || {};
				scope.ons.slidingMenu = scope.ons.slidingMenu || {};

				var Swiper = Class.extend({
					init: function(element) {
						this.$el = element;
						this.el = element[0];
						this.VERTICAL_THRESHOLD = 20;
						this.HORIZONTAL_THRESHOLD = 20;
						this.behindPage = element[0].querySelector('.behind');
						this.$behindPage = angular.element(this.behindPage);
						this.abovePage = element[0].querySelector('.above');
						this.$abovePage = angular.element(this.abovePage);
						this.blackMask = element[0].querySelector('.onsen_sliding-menu-black-mask');
						this.previousX = 0;
						this.MAX = this.abovePage.clientWidth * MAIN_PAGE_RATIO;
						this.currentX = 0;
						this.startX = 0;

						this.attachMethods();						
						this.bindEvents();

						if(scope.abovePage){
							scope.ons.slidingMenu.setAbovePage(scope.abovePage);
						}

						window.setTimeout(function(){
							this.behindPage.style.opacity = 1;
							this.blackMask.style.opacity = 1;
						}.bind(this), 100);
					},

					bindEvents: function() {
						this.hammertime = new Hammer(this.el);
						this.hammertime.on("dragleft dragright swipeleft swiperight release", this.handleEvent.bind(this));
						this.$abovePage.bind('webkitTransitionEnd', this.onTransitionEnd.bind(this));
					},

					attachMethods: function(){
						scope.ons.slidingMenu.setAbovePage = function(page) {
							if (page) {
								$http({
									url: page,
									method: "GET"
								}).error(function(e){
									console.error(e);
								}).success(function(data, status, headers, config) {
									var templateHTML = angular.element(data.trim());
									var page = angular.element('<div></div>');
									page.addClass('page');
									page[0].style.opacity = 0;
									var pageContent = $compile(templateHTML)(scope);
									page.append(pageContent);
									this.$abovePage.append(page);

									// prevent black flash
									setTimeout(function(){
										page[0].style.opacity = 1;
										if(this.currentPage){
											this.currentPage.remove();
										}
										this.currentPage = page;
									}.bind(this), 0);

								}.bind(this));
							} else {
								throw new Error('cannot set undefined page');
							}
						}.bind(this);
					},


					handleEvent: function(ev) {
						switch (ev.type) {
						
							case 'dragleft':
							case 'dragright':	
								ev.gesture.preventDefault();							
								var deltaX = ev.gesture.deltaX;
								this.currentX = this.startX + deltaX;
								if (this.currentX >= 0) {
									this.translate(this.currentX);
								}
								break;

							case 'swipeleft':
								ev.gesture.preventDefault();	
								this.close();
								break;

							case 'swiperight':
								ev.gesture.preventDefault();	
								this.open();
								break;

							case 'release':
								if (this.currentX > this.MAX / 2) {
									this.open();
								} else {
									this.close();
								}
								break;
						}
					},

					onTransitionEnd: function() {
						this.$abovePage.removeClass('transition');
						this.$behindPage.removeClass('transition');
					},

					close: function() {
						this.startX = 0;
						if (this.currentX !== 0) {
							this.$abovePage.addClass('transition');
							this.$behindPage.addClass('transition');
							this.translate(0);
						}
					},

					open: function() {
						this.startX = this.MAX;
						if (this.currentX != this.MAX) {
							this.$abovePage.addClass('transition');
							this.$behindPage.addClass('transition');
							this.translate(this.MAX);
						}
					},

					toggle: function() {
						if (this.startX === 0) {
							this.open();
						} else {
							this.close();
						}
					},

					translate: function(x) {
						this.abovePage.style.webkitTransform = 'translate3d(' + x + 'px, 0, 0)';
						var behind = (x - this.MAX) / this.MAX * 10;
						var opacity = 1 + behind / 100;
						this.behindPage.style.webkitTransform = 'translate3d(' + behind + '%, 0, 0)';
						this.behindPage.style.opacity = opacity;
						this.currentX = x;
					}
				});

				var swiper = new Swiper(element);

				scope.pages = {
					behind: scope.behindPage				
				};
				

				scope.ons.slidingMenu.openMenu = function() {
					swiper.open();
				};

				scope.ons.slidingMenu.closeMenu = function() {
					swiper.close();
				};

				scope.ons.slidingMenu.toggleMenu = function() {
					swiper.toggle();
				};				

				scope.ons.slidingMenu.setBehindPage = function(page) {
					if (page) {
						scope.pages.behind = page;
					} else {
						throw new Error('cannot set undefined page');
					}
				};

				scope.ons.screen = scope.ons.screen || {};
				scope.ons.screen.presentPage = function(page) {
					callParent(scope, 'ons.screen.presentPage', page);
				};

				scope.ons.screen.dismissPage = function() {
					callParent(scope, 'ons.screen.dismissPage');
				};

				function callParent(scope, functionName, param) {
					if (!scope.$parent) {
						return;
					}

					var parentFunction = stringToFunction(scope.$parent, functionName);
					if (parentFunction) {
						parentFunction.call(scope, param);
					} else {
						callParent(scope.$parent, functionName, param);
					}

				}

				function stringToFunction(root, str) {
					var arr = str.split(".");

					var fn = root;
					for (var i = 0, len = arr.length; i < len; i++) {
						fn = fn[arr[i]];
					}

					if (typeof fn !== "function") {
						return false;
					}

					return fn;
				}
			}
		};
	});
})();