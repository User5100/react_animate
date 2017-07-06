import React, { Component } from 'react';
import { Observable } from 'rxjs/Observable'
import 'rxjs/add/observable/fromEvent'
import 'rxjs/add/observable/merge'
import 'rxjs/add/operator/switchMap'
import 'rxjs/add/operator/takeUntil'
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/startWith'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/mapTo'
import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/take'
import 'rxjs/add/operator/combineLatest'
import 'rxjs/add/operator/debounceTime'

class App extends Component {

	constructor() {
		super()

		this.state = {
			y: 100,
			isWordHighlighted: false,
			rangeHighlighted: { left: 0, top: 0, width: 0, height: 0 },
			wordHighlightedPosition: { left: 0, top: 0 },
			isHighlighterEnabled: true
		}

		this.isWordCoveredByHighlightedRange = this.isWordCoveredByHighlightedRange.bind(this)
		this.getMousePosition = this.getMousePosition.bind(this)
		this.dragAndDropAnItem = this.dragAndDropAnItem.bind(this)
	}

	isWordCoveredByHighlightedRange() {
		//TODO - Calculate area covered by rangeHighlighted
			let { top, left, bottom, right, width } = this.rangeHighlighter.getBoundingClientRect()

			
			if((top <= this.ballOne.getBoundingClientRect().top &&
				  left <= this.ballOne.getBoundingClientRect().left) ||
				 (top <= this.ballOne.getBoundingClientRect().bottom &&
				 	left <= this.ballOne.getBoundingClientRect().right)) {

				this.setState({ isWordHighlighted: true })
			} else {
				this.setState({ isWordHighlighted: false })
			}
	}

	getMousePosition (mouseEvent, left, top) {
		let { clientX, clientY } = mouseEvent
		return { x: clientX - left, y: clientY - top }
	}

	dragAndDropAnItem () {

		let { top, left } = this.ballsContainer.getBoundingClientRect()

		this.endHighlight$ = Observable.fromEvent(this.ballsContainer, 'mousedown')
																	 .filter(() => this.state.isHighlighterEnabled)
																	 .switchMap(() => this.move$.takeUntil(this.mouseUp$))
																	 .map(mouseEvent => {
																			return this.getMousePosition(mouseEvent, left, top)
																	  })

		this.startHighlight$ = Observable.fromEvent(this.ballsContainer, 'mousedown')
																		 .filter(() => this.state.isHighlighterEnabled)
																		 .switchMap(() => this.move$.takeUntil(this.mouseUp$)
																																.take(1))
																		 .map(mouseEvent => {
																				return this.getMousePosition(mouseEvent, left, top)
																		 })

		//Disable highlighter if no activity for 300ms
		this.endHighlight$.debounceTime(1000)
											.subscribe(() => this.setState({ isHighlighterEnabled: false }))

		this.startHighlight$.combineLatest(this.endHighlight$, (start, end) => {

			return { left: start.x, 
							 top: start.y, 
							 width: end.x - start.x, 
							 height: end.y - start.y }

			/*
			{ left: start.x - (end.x - start.x), 
							 top: start.y - (end.y - start.y), 
							 width: end.x - start.x, 
							 height: end.y - start.y }
			*/
		})
		.subscribe(rangeHighlighted => {
			this.setState({ rangeHighlighted: rangeHighlighted })

			this.isWordCoveredByHighlightedRange()
			
		})

		//Pressing Escape key on canvas will make the rangeHighlighter disappear
		//and re-enable the highlighter
		Observable.fromEvent(document, 'keydown')
							.filter(keyboardEvent => keyboardEvent.key == 'Escape')
							.subscribe(() => {
								this.setState({ rangeHighlighted: { left: 0, top: 0, width: 0, height: 0 },
																isHighlighterEnabled: true })
							})

		//Handle dragging of highlighted word

		Observable.fromEvent(this.rangeHighlighter, 'mousedown')
							.filter(() => !this.state.isHighlighterEnabled && this.state.isWordHighlighted)
							.switchMap(() => this.move$.takeUntil(this.mouseUp$))
							.map(mouseEvent => {
								return this.getMousePosition(mouseEvent, left, top)
						  })
							.subscribe(position => {
								console.log('Handle dragging of highlighted word')

								this.setState((prevState) => {

									return {
										rangeHighlighted: { 
											left: position.x, 
											top: position.y, 
											width: prevState.rangeHighlighted.width, 
											height: prevState.rangeHighlighted.height	 
										},
										wordHighlightedPosition: {
											left: prevState.wordHighlightedPosition.left + position.x - prevState.rangeHighlighted.left, 
											top: prevState.wordHighlightedPosition.top + position.y - prevState.rangeHighlighted.top, 																																
										}
									}
								})
							})
	}

	componentDidMount () {

		this.move$ = Observable.fromEvent(document, 'mousemove')

		this.mouseUp$ = Observable.fromEvent(document, 'mouseup')

		this.drag$ = Observable.fromEvent(this.word, 'mousedown')
													 .switchMap(() => this.move$.takeUntil(this.mouseUp$))
													 .map(mouseEvent => {
													 		console.log(mouseEvent)
													 		let { movementY } = mouseEvent	
															return movementY
													 })
													 
		this.dragUp$ = this.drag$.filter(direction => direction > 0)
													 	 .mapTo(50)

		this.dragDown$ = this.drag$.filter(direction => direction < 0)
													 	 	 .mapTo(-50)

		//Drag up or down snap to grid 20px (20px per row)											 	 	 
		Observable.merge(this.dragUp$, this.dragDown$)
							.scan(function(acc, curr) {
								return acc + curr
							}, 0)
							.startWith(0)
							.do(debug => console.log(debug))
							.filter(positionY => positionY > 0 && positionY < 300)
							.subscribe(y => {
								this.setState({ y: y })
							})

		//End Snap to grid

		//Start drag drop multiple items

		this.dragAndDropAnItem()						
	}

	render() {

		return(
			<div>

				<div
					ref={word => this.word = word}
					style={Object.assign({}, { top: `${this.state.y}px` }, styles.word)} >
				</div>

				<div
					className='balls-container'
					ref={ballsContainer => this.ballsContainer = ballsContainer} >
					<div
						ref={ballOne => this.ballOne = ballOne}
						className='ball'
						style={Object.assign({}, this.state.wordHighlightedPosition)} >
					</div>
					<div 
						className='ball'
						style={styles.ballTwo} >
					</div>
					<svg
						ref={rangeHighlighter => this.rangeHighlighter = rangeHighlighter} 
						style={Object.assign({}, this.state.rangeHighlighted, styles.rangeHighlighter)}>
					</svg>
				</div>

			</div>
		)
	}
}

export default App

const styles = {
	word: {
		borderRadius: '40%',
		background: 'seagreen',
		width: '100px',
		height: '50px',
		position: 'absolute',
		zIndex: 2
	},
	ballOne: {
		top: '200px'
	},
	ballTwo: {
		top: '300px'
	},
	rangeHighlighter: {
		position: 'absolute',
		background: 'peru',
		zIndex: 2
	}
}