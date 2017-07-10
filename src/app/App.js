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
			isHighlighterEnabled: true,
      position: null,
			srts: [
				{
					words: [{ id: 1,
										word: 'Hi',
										speakerNo: 1,
										timestamp: 1 }, 
									{ id: 2,
										word: 'my',
										speakerNo: 1,
										timestamp: 2 }, 
									{ id: 3,
										word: 'name',
										speakerNo: 1,
										timestamp: 3 }, 
									{ id: 4,
										word: 'is',
										speakerNo: 1,
										timestamp: 4 },
									{ id: 5,
										word: 'Thai',
										speakerNo: 1,
										timestamp: 5 }]
				},
				{
					words: [{ id: 6,
										word: 'Good',
										speakerNo: 2,
										timestamp: 6 }, 
									{ id: 7,
										word: 'morning',
										speakerNo: 2,
										timestamp: 7 }, 
									{ id: 8,
										word: 'how',
										speakerNo: 2,
										timestamp: 8 }, 
									{ id: 9,
										word: 'are',
										speakerNo: 2,
										timestamp: 9 },
									{ id: 10,
										word: 'you?',
										speakerNo: 2,
										timestamp: 10 }]
				}
			],
      inputText: '',
      showInput: false,
      indexOfWordBeforeInsert: 0,
      highlightElementCoverage: []
		}

		this.wordHighlightedPositions = []

		this.isWordCoveredByHighlightedRange = this.isWordCoveredByHighlightedRange.bind(this)
		this.getMousePosition = this.getMousePosition.bind(this)
		this.dragAndDropAnItem = this.dragAndDropAnItem.bind(this)
    this.handleTextInputChange = this.handleTextInputChange.bind(this)
    this.handleTextInputOnEnter = this.handleTextInputOnEnter.bind(this)
    this.handleDisplayInputBox = this.handleDisplayInputBox.bind(this)
    this.calculateInitialWordHighlightedPositions = this.calculateInitialWordHighlightedPositions.bind(this)
    this.calculateDiarizationChanges = this.calculateDiarizationChanges.bind(this)
	}

  handleTextInputChange(event) {
    let { value } = event.target
    this.setState({ inputText: value })
  }

  handleDisplayInputBox(index) {
    
    this.setState({ showInput: true, indexOfWordBeforeInsert: index }, () => {
      //Callback that automatically sets the focus on input
      //so user can type right away wihtout needing to click
      //on input box
      this.input.focus()
    })
  }

  handleTextInputOnEnter(event) {

    console.log('index: ', this.state.indexOfWordBeforeInsert)
    
    if(event.key === 'Enter') { //Only perform if onEnter

      let words = []

      this.state.srts.map(segment => {
        words = [...words, ...segment.words]
      })

      //Insert new word into the existing array of words
      Promise.resolve([...words.slice(0, this.state.indexOfWordBeforeInsert + 1),
                       { word: this.state.inputText, timestamp: null, speakerNo: words[this.state.indexOfWordBeforeInsert].speakerNo },
                       ...words.slice(this.state.indexOfWordBeforeInsert + 1, ...words.length)])
             .then((_words) => {

                let revisedSegments = []
                let currentSpeakerNo

                _words.map((wordObj, i) => {
                  
                  if(!revisedSegments[wordObj.speakerNo -1]) { //If segment doesn't exist push segment along with first word
                    
                    revisedSegments.push({
                      words: [wordObj]
                    })
                  } else { //If segment does exist then push worObj into it's word array
                    revisedSegments[wordObj.speakerNo - 1].words.push(wordObj)
                  }
                })

                console.log(revisedSegments)

                this.setState({ srts: revisedSegments, inputText: '', showInput: false })
             })    
    }
  }

	isWordCoveredByHighlightedRange(child) {
		//TODO - Calculate area covered by rangeHighlighted
			let { top, left, bottom, right, width } = this.rangeHighlighter.getBoundingClientRect()

			let check = { top: top <= child.getBoundingClientRect().bottom,
			        			left: left <= child.getBoundingClientRect().right,
			        	  	right: right >= child.getBoundingClientRect().left,
			        	  	bottom: bottom >= child.getBoundingClientRect().top
			        		}	

			//console.log(child, check)
			
			if((top <= child.getBoundingClientRect().bottom) &&
				 (left <= child.getBoundingClientRect().right) &&
				 (right >= child.getBoundingClientRect().left) &&
				 (bottom >= child.getBoundingClientRect().top)) {
				  
          //console.log('child', child)
				  //this.setState({ isWordHighlighted: true })
          //console.log('Highlighter: ',this.rangeHighlighter.getBoundingClientRect(), 'Child: ', child.innerHTML, child.getBoundingClientRect())

        return true
			} else {
				//this.setState({ isWordHighlighted: false })
        return false
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

      let highlightElementCoverage = Array.from(this.wordsContainer.childNodes).map(child => {
        return this.isWordCoveredByHighlightedRange(child)
      })

      this.setState({ highlightElementCoverage: highlightElementCoverage })	
			
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
							.filter(() => !this.state.isHighlighterEnabled)
							.switchMap(() => this.move$.takeUntil(this.mouseUp$))
							.map(mouseEvent => {
								return this.getMousePosition(mouseEvent, left, top)
						  })
							.subscribe(position => {
								console.log('Handle dragging of highlighted word', this.wordHighlightedPositions)

                this.setState({ position: { top: position.x, 
                                            left: position.y - this.state.rangeHighlighted.top } })

                let revisedWordHighlightedPositions

                revisedWordHighlightedPositions = this.wordHighlightedPositions.map((prevWordPosition, i) => {

                  if(this.state.highlightElementCoverage[i]) {
                    return { left: prevWordPosition.left + position.x - this.state.rangeHighlighted.left, 
                             top: prevWordPosition.top + position.y - this.state.rangeHighlighted.top }
                  } else {
                    return prevWordPosition
                  }
                  
                })

                //Used revisedWordHighlightedPositions to calculate diarization changes made
                this.calculateDiarizationChanges(revisedWordHighlightedPositions);

								this.setState((prevState) => {
									return {
										rangeHighlighted: { 
											left: position.x, 
											top: position.y, 
											width: prevState.rangeHighlighted.width, 
											height: prevState.rangeHighlighted.height	 
										}
										
									}
								}, () => {
									this.wordHighlightedPositions = revisedWordHighlightedPositions
								})
							})
      //END Handle dragging of highlighted word

      //Handle deletion of highlighted words
      this.remove$ = Observable.fromEvent(document, 'keydown')
                               .filter(key => {
                                  if(key.code === 'Backspace' || key.code === 'Delete') {
                                    return 1
                                  } else {
                                    return 0
                                  }
                               })

      this.remove$.subscribe(() => {
        let revisedSegments = []
        let currentSpeakerNo //store local state of current speaker to reconstruct srts data structure
        let words = []

        this.state.srts.map(segment => {
          words = [...words, ...segment.words]
        })

        this.state.highlightElementCoverage.map((isWordHighlighted, i) => {

          if(isWordHighlighted) { //holds boolean indicating whether the word has been highlighted or not
            words.splice(i, 1) //If highlighted then remove from words array
          }
          
        })

        words.map((wordObj, i) => {
          
          if(!revisedSegments[wordObj.speakerNo -1]) { //If segment doesn't exist push segment along with first word
            
            revisedSegments.push({
              words: [wordObj]
            })
          } else { //If segment does exist then push worObj into it's word array
            revisedSegments[wordObj.speakerNo - 1].words.push(wordObj)
          }
        })

        console.log(revisedSegments)

        this.setState({ srts: revisedSegments, inputText: '', showInput: false })

      })
      //END Handle deletion of highlighted words
	}

  calculateInitialWordHighlightedPositions () {

    let initialHighlightedPositions = []

    this.state.srts.map(segment => {
      segment.words.map(wordObj => {
        initialHighlightedPositions.push({ left: 0, top: (wordObj.speakerNo * 40) - 40 }) 
      })
    })

    //this.setState({ wordHighlightedPositions: initialHighlightedPositions })
    this.wordHighlightedPositions = initialHighlightedPositions
  }

  calculateDiarizationChanges (revisedWordHighlightedPositions) {
    //revisedWordHighlightedPositions is an array of objects with left and top properties
    //signifying position for each word

    let words = []
    let revisedSegments = []

    this.state.srts.map(segment => {
      words = [...words, ...segment.words]
    })

    //Sort words - Fixes words listed out of order
    words = words
						 .sort((currWordObj, nextWordObj) => {
					    	if(currWordObj.id < nextWordObj.id) {
					    		return -1
					    	}

					    	if(currWordObj.id > nextWordObj.id) {
					    		return 1
					    	}

					    	return 0
					    })
		

    
    //Loop through each word end position
    //Minus 40 from top property then divide by 40 (there is 40px gap between rows - TODO - set this 'globally')and round down the result to nearest integer
    //Then add the result to the current speaker number

    revisedWordHighlightedPositions.map((wordPosition, i) => {
      //Push updated speakerNo to wordObj of words array

      let newSpeakerNo = Math.round((wordPosition.top / 40) + 1)
      //Assign newSpeakerNo to each wordObj of words array
      words[i].speakerNo = newSpeakerNo
      //console.log(`Speaker for word ${words[i].word} now set to`, Math.round((wordPosition.top / 40) + 1, `Original speaker: ${words[i].speakerNo}`))
    })

    //console.log(words)

    //Restructure the revised segments
    //Set state of revised segments here

    words.map((wordObj, i) => {
          
      if(!revisedSegments[wordObj.speakerNo -1]) { //If segment doesn't exist push segment along with first word
        
        revisedSegments.push({
          words: [wordObj]
        })
      } else { //If segment does exist then push worObj into it's word array
        revisedSegments[wordObj.speakerNo - 1].words.push(wordObj)
      }
    })

    


    revisedSegments.map(segment => {
    	
    	let words
    	words = segment.words
    								 .sort((currWordObj, nextWordObj) => {
									    	if(currWordObj.id < nextWordObj.id) {
									    		return -1
									    	}

									    	if(currWordObj.id > nextWordObj.id) {
									    		return 1
									    	}

									    	return 0
									    })
    	console.log(words)
    	return Object.assign({}, segment, { words: words })
		})


		Promise.resolve(revisedSegments.map(segment => {
    	
    	let words
    	words = segment.words
    								 .sort((currWordObj, nextWordObj) => {
									    	if(currWordObj.id < nextWordObj.id) {
									    		return -1
									    	}

									    	if(currWordObj.id > nextWordObj.id) {
									    		return 1
									    	}

									    	return 0
									    })
    	console.log(words)
    	return Object.assign({}, segment, { words })
		})).then((data) => console.log('Hello', data))



    console.log(revisedSegments)

    this.setState({ srts: revisedSegments }, () => {
      this.calculateInitialWordHighlightedPositions() //Snap to grid i.e when speakerNo changes
    //for a word set the state and then calculate new positions based on new state
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
		//End drag drop multiple items

    this.calculateInitialWordHighlightedPositions()

	}

	render() {

		let srts = this.state.srts
    let input
    let words = []

    //Create a single array of words from srts data structure
    //So the words indices mirror the childNodes indices (used to work out which elements have been highlighted)
    srts.map(segment => {
      words = [...words, ...segment.words]
    })



    //Conditionally display inputBox that allows user to insert word(s)
    input = (index) => {
      if(this.state.showInput && index == this.state.indexOfWordBeforeInsert) { //show inputBox insert 
      return (
        <input
          className='input-box'
          style={styles.inputBox}
          ref={input => this.input = input}
          value={this.state.inputText}
          onChange={this.handleTextInputChange}
          onKeyPress={this.handleTextInputOnEnter}
          type='text' /> 
        )
      }
    }
    
		return(
			<div>
				<div
					ref={word => this.word = word}
					style={Object.assign({}, { top: `${this.state.y}px` }, styles.word)} >
				</div>
				<div
					className='balls-container'
					ref={ballsContainer => this.ballsContainer = ballsContainer} >

					<svg
						ref={rangeHighlighter => this.rangeHighlighter = rangeHighlighter} 
						style={Object.assign({}, this.state.rangeHighlighted, styles.rangeHighlighter)}>
					</svg>
          <div
            className='words-container'
            ref={wordsContainer => this.wordsContainer = wordsContainer}
            style={styles.wordsContainer}>
            {
							words.map((wordObj, i) => 
								(<div
									key={wordObj.word}
									ref={wordSpan => this.wordSpan = wordSpan}
                  
									style={styles.wordContainer}> 
									<span    
										className='word'
										key={wordObj.word}
                    data-speaker-number={wordObj.speakerNo}
									  style={Object.assign({}, styles.word, { top: `${(wordObj.speakerNo * 40) - 40}px` },this.state.highlightElementCoverage[i]? {} : {})}
									>{wordObj.word}
									</span>
									<span
										onClick={() => this.handleDisplayInputBox(i)}
                    data-speaker-number={wordObj.speakerNo}
										style={Object.assign({}, { top: `${(wordObj.speakerNo * 40) - 40}px` }, styles.addText)}>+</span>
										{input(i)}
								</div>))
						}

          </div>
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
    maxWidth: '200px',
		height: '20px',
		position: 'relative',
		zIndex: 2,
    marginLeft: '20px',
    color: '#FFF',
    fontSize: '22px'
	},
	ballOne: {
		top: '200px'
	},
	ballTwo: {
		top: '300px'
	},
	rangeHighlighter: {
		position: 'absolute',
    border: '1px solid black',
		background: 'transparent',
		zIndex: 2
	},
  wordsContainer: {
    zIndex: 3,
    position: 'absolute',
    top: '400px',
    left: '20px',
    userSelect: 'none',
		width: '100%'
  },
  wordContainer: {
    display: 'inline'
  },
  addText: {
    backgroundColor: 'peru',
    margin: '0px 18px 0px 18px',
		position: 'relative'
  },
  inputBox: {
    backgroundColor: 'seagreen',
    padding: '8px',
    border: 'none',
    color: '#FFF'
  }
}