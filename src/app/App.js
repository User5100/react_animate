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
			isDisplayWord: true, //Toggle between displaying words and editing a word
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
			inputEditText: '',
      showInputForNewWord: false,
      indexOfWordBeforeInsert: 0,
			idOfWordBeforeInsert: null,
      highlightElementCoverage: [],
			indexOfWordToBeEdited: null,
			idOfWordToBeEdited: null
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
		this.handleClickToEditWord = this.handleClickToEditWord.bind(this)
		this.handleInputEditWord = this.handleInputEditWord.bind(this)
		this.insertNewWordIntoExistingArrayOfWords = this.insertNewWordIntoExistingArrayOfWords.bind(this)
		this.handleEditOfExistingWord = this.handleEditOfExistingWord.bind(this)
	}

	handleInputEditWord(event) {
		let { value }	= event.target		
		this.setState({ inputEditText: value })
	}

  handleTextInputChange(event) {
    let { value } = event.target
    this.setState({ inputText: value })
  }

  handleDisplayInputBox(wordObj, index) {
    
    if(this.state.rangeHighlighted.left == 0) {
	    this.setState({ showInputForNewWord: true,
											isDisplayWord: true, //hide edit input box if it is displayed
											indexOfWordBeforeInsert: index,
											idOfWordBeforeInsert: wordObj.id,
											rangeHighlighted: { left: 0, top: 0, width: 0, height: 0 },
											isHighlighterEnabled: true, }, () => {
	      //Callback that automatically sets the focus on input
	      //so user can type right away wihtout needing to click
	      //on input box
	      this.input.focus()
	    })
	  } else {
	  	console.log('Handle drag instead of display input box to insert word');
	  }
  }

  handleTextInputOnEnter(event) {
		//console.log(event.key, event)
		let previousSpeakerNo
    
    if(event.key === 'Enter') { //Only perform if onEnter
			
      let words = []
			let userInput = []

      this.state.srts.map(segment => {
        words = [...words, ...segment.words]
      })
			
			userInput = event.target.value.split(' ')
			
			//convert userInput into an array of word objects before inserting
			//into new list of words
			userInput = userInput.map((wordStr, i) => {
				return {
					word: wordStr,
					timestamp: null,
					speakerNo: this.state.showInputForNewWord? words[this.state.indexOfWordBeforeInsert].speakerNo : words[this.state.indexOfWordToBeEdited].speakerNo,
					id: this.state.showInputForNewWord? (this.state.idOfWordBeforeInsert + ((i + 1) * 0.01)) : (this.state.idOfWordToBeEdited + ((i + 1) * 0.01))
					//id: this.state.showInputForNewWord? (this.state.indexOfWordBeforeInsert + ((i + 1) * 0.01) + 1) : (this.state.indexOfWordToBeEdited + ((i + 1) * 0.01) + 1)
					//Create temp ID to allow sorting by id so reactjs rendors the words in order
					//TODO - Consider sorting by timestamp as subsequent IDs generated by backend won't be in sequential order
				}
			})

      //Insert new word into the existing array of words
			
			if(this.state.showInputForNewWord) { //Handle inserttion of new word
				this.insertNewWordIntoExistingArrayOfWords(words, userInput)  
			} else { //Handle editing of existing word
				
				this.handleEditOfExistingWord(words, userInput)
			}
       
    }
  } //END handleTextInputOnEnter

	handleEditOfExistingWord(words, userInput) {
		
		Promise.resolve([...words.slice(0, this.state.indexOfWordToBeEdited),
                     ...userInput,
                    ...words.slice(this.state.indexOfWordToBeEdited + 1, ...words.length)])
             .then((_words) => {
							  console.log('Handle editing on existing word', 'userInput', userInput, _words)
                let revisedSegments = []
                let previousSpeakerNo

		
                _words.map((wordObj, i) => {

									if(previousSpeakerNo === wordObj.speakerNo) { //then push to existing words in current segment
									//console.log('speaker HAS NOT changed Index: ', i, 'Word: ', wordObj.word)

										Promise.resolve(revisedSegments[wordObj.speakerNo - 1].words.push(wordObj))
													.then(() => previousSpeakerNo = wordObj.speakerNo)
									} else { //speakerNo has changed so create a new segment or it's the first element
										//console.log('speaker number changed Index: ', i, 'Word: ', wordObj.word)

										Promise.resolve(revisedSegments.push({
											words: [wordObj]
										}))
										.then(() => previousSpeakerNo = wordObj.speakerNo)
									}

                })

                this.setState({ srts: revisedSegments, 
																inputEditText: '', 
																isDisplayWord: true, //Display words instead of displaying edit inputbox - TODO rename 'isDisplayWord' as unclear!
																isHighlighterEnabled: true,
																rangeHighlighted: { left: 0, top: 0, width: 0, height: 0 } 
															}, () => {
																this.calculateInitialWordHighlightedPositions()
															})
             })




	}

	insertNewWordIntoExistingArrayOfWords(words, userInput) {
		Promise.resolve([...words.slice(0, this.state.indexOfWordBeforeInsert + 1),
                     ...userInput,
                    ...words.slice(this.state.indexOfWordBeforeInsert + 1, ...words.length)])
             .then((_words) => {
                let revisedSegments = []
                let previousSpeakerNo

								/*
                _words.map((wordObj, i) => {
                  
                  if(!revisedSegments[wordObj.speakerNo -1]) { //If segment doesn't exist push segment along with first word
                    
                    revisedSegments.push({
                      words: [wordObj]
                    })
                  } else { //If segment does exist then push worObj into it's word array
                    revisedSegments[wordObj.speakerNo - 1].words.push(wordObj)
                  }
                })
								*/
							
								_words.map((wordObj, i) => {

									if(previousSpeakerNo === wordObj.speakerNo) { //then push to existing words in current segment
									//console.log('speaker HAS NOT changed Index: ', i, 'Word: ', wordObj.word)

										Promise.resolve(revisedSegments[wordObj.speakerNo - 1].words.push(wordObj))
													.then(() => previousSpeakerNo = wordObj.speakerNo)
									} else { //speakerNo has changed so create a new segment or it's the first element
										//console.log('speaker number changed Index: ', i, 'Word: ', wordObj.word)

										Promise.resolve(revisedSegments.push({
											words: [wordObj]
										}))
										.then(() => previousSpeakerNo = wordObj.speakerNo)
									}
                })

                this.setState({ srts: revisedSegments, 
																inputText: '', 
																showInputForNewWord: false,
																isHighlighterEnabled: true,
																rangeHighlighted: { left: 0, top: 0, width: 0, height: 0 } 
															}, () => {
																this.calculateInitialWordHighlightedPositions()
															})
             }) 
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
					//console.log(child, true)
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

		//Disable highlighter if no activity for 30ms? --> debounceTime
		this.endHighlight$.subscribe(() => this.setState({ isHighlighterEnabled: false, 
																											 rangeHighlighted: { left: 0, top: 0, width: 0, height: 0 } }))

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
			//console.log(Array.from(this.wordsContainer.childNodes))
      let highlightElementCoverage = Array.from(this.wordsContainer.childNodes).map(child => {
        //Get the firstChild of child (i.e the word not the element representing gap between words)
				return this.isWordCoveredByHighlightedRange(child.firstChild)
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

		//Mouseup should make highlighter range disappear
		Observable.fromEvent(this.rangeHighlighter, 'mousedown')
							.switchMap(() => this.move$.takeUntil(this.mouseUp$))
							.switchMap(() => this.mouseUp$.take(1))
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
								//console.log('Handle dragging of highlighted word', this.wordHighlightedPositions)

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
															 //Only trigger delete if both inputBox and edit inputbox are hidden
															 .filter(() => !this.state.showInputForNewWord && this.state.isDisplayWord) 

      this.remove$.subscribe(() => {
        let revisedSegments = []
        let currentSpeakerNo //store local state of current speaker to reconstruct srts data structure
        let words = []
				let previousSpeakerNo

        this.state.srts.map(segment => {
          words = [...words, ...segment.words]
        })

				//console.log(this.state.highlightElementCoverage)

				words = words.filter((wordObj, i) => {
					if(this.state.highlightElementCoverage[i]) { //holds boolean indicating whether the word has been highlighted or not
						return 0
					} else return 1
				})

				/*  
        words.map((wordObj, i) => {
          
          if(!revisedSegments[wordObj.speakerNo -1]) { //If segment doesn't exist push segment along with first word
            
            revisedSegments.push({
              words: [wordObj]
            })
          } else { //If segment does exist then push worObj into it's word array
            revisedSegments[wordObj.speakerNo - 1].words.push(wordObj)
          }
        })
				*/

				words.map((wordObj, i) => {
					if(previousSpeakerNo === wordObj.speakerNo) { //then push to existing words in current segment
					//console.log('speaker HAS NOT changed Index: ', i, 'Word: ', wordObj.word)

						Promise.resolve(revisedSegments[wordObj.speakerNo - 1].words.push(wordObj))
									.then(() => previousSpeakerNo = wordObj.speakerNo)
					} else { //speakerNo has changed so create a new segment or it's the first element
						//console.log('speaker number changed Index: ', i, 'Word: ', wordObj.word)

						Promise.resolve(revisedSegments.push({
							words: [wordObj]
						}))
						.then(() => previousSpeakerNo = wordObj.speakerNo)
					}
				})




        console.log(revisedSegments)

        this.setState({ srts: revisedSegments, 
												inputText: '', 
												showInputForNewWord: false,
											 	rangeHighlighted: { left: 0, top: 0, width: 0, height: 0 },
												isHighlighterEnabled: true 
											}, () => {
												this.calculateInitialWordHighlightedPositions()
											})

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
		let previousSpeakerNo

    this.state.srts.map(segment => {
      words = [...words, ...segment.words]
    })

    //Sort words - Fixes words listed out of order
    words = words.sort((currWordObj, nextWordObj) => {
			if(currWordObj.id < nextWordObj.id) {
				return -1
			}

			if(currWordObj.id > nextWordObj.id) {
				return 1
			}
			return 0
		})

		console.log('calculate D: ', words)
		console.log('word positions: ', revisedWordHighlightedPositions)
		
    //Loop through each word end position
    //Minus 40 from top property then divide by 40 (there is 40px gap between rows - TODO - set this 'globally')and round down the result to nearest integer
    //Then add the result to the current speaker number

    revisedWordHighlightedPositions.map((wordPosition, i) => {
      //Push updated speakerNo to wordObj of words array

      let newSpeakerNo = Math.round((wordPosition.top / 40) + 1)
      //Assign newSpeakerNo to each wordObj of words array
      words[i].speakerNo = newSpeakerNo
			//console.log('revisedWordHighlightedPositions: ', revisedWordHighlightedPositions)
      //console.log(`Speaker for word ${words[i].word} now set to`, Math.round((wordPosition.top / 40) + 1, `Original speaker: ${words[i].speakerNo}`))
    })

		//console.log('words: ', words) //Confirmation words are correctly ordered by ID
		//***CREATE REVISED SEGMENTS ****//
		//TODO - revisedSegment not returning the correct result
		//The speaker no is 'always changing' since the promise isn't being returned in time
		//for the next iteration
		//However wihout the promise the resulting words and segments do not return in the correct
		//order.
		//TODO - Explore the use of recursive functions to avoid race condition
    words.map((wordObj, i) => {
			
			if(previousSpeakerNo === wordObj.speakerNo) { //then push to existing words in current segment
				//console.log('speaker HAS NOT changed Index: ', i, 'Word: ', wordObj.word)

				Promise.resolve(revisedSegments[wordObj.speakerNo - 1].words.push(wordObj))
							 .then(() => previousSpeakerNo = wordObj.speakerNo)
			} else { //speakerNo has changed so create a new segment or it's the first element
				//console.log('speaker number changed Index: ', i, 'Word: ', wordObj.word)

				Promise.resolve(revisedSegments.push({
          words: [wordObj]
        }))
				.then(() => previousSpeakerNo = wordObj.speakerNo)
			}
			//console.log('Create segment order test: ', i, revisedSegments)

			//Track state of the speaker to perform the above IF condition
			//work out if the current speaker no is same as previous speaker no
			//if so push element to words array of current segment
			//if not create a new segment with a words array and push the object there 
			//previousSpeakerNo = wordObj.speakerNo
    })

		console.log('revised: ', revisedSegments)

    this.setState({ srts: revisedSegments
		              }, () => {
      this.calculateInitialWordHighlightedPositions() //Snap to grid i.e when speakerNo changes
    //for a word set the state and then calculate new positions based on new state
    })
  } //END calculateDiarizationChanges

	handleClickToEditWord (wordObject, index) {
		
		//console.log(this.state.rangeHighlighted)

		if(this.state.rangeHighlighted.left == 0) {
			this.setState({ isDisplayWord: false, //set display to edit word
										showInputForNewWord: false, //Hide insert word inputBox if it happens to be displayed
										inputEditText: wordObject.word, //set inputBox value to the word clicked,
										indexOfWordToBeEdited: index,
										idOfWordToBeEdited: wordObject.id,
										rangeHighlighted: { left: 0, top: 0, width: 0, height: 0 },
										isHighlighterEnabled: true
								 }, () => {
									 this.inputEdit.focus() //Automatically focus on input edit box if user clicks on existing word to edit it
								 }) 
		} else {
			console.log('Handle a drag instead of edit word - line 542')
		}
		
	}

	componentDidMount () {

		this.move$ = Observable.fromEvent(document, 'mousemove')

		this.mouseUp$ = Observable.fromEvent(document, 'mouseup')

		//Start drag drop multiple items
		this.dragAndDropAnItem()	
		//End drag drop multiple items

    this.calculateInitialWordHighlightedPositions()

	}

	render() {

		let srts = this.state.srts
    let input
    let words = []
		let edit
		let displayWordOrEditWord

    //Create a single array of words from srts data structure
    //So the words indices mirror the childNodes indices (used to work out which elements have been highlighted)
    srts.map(segment => {
      words = [...words, ...segment.words]
    })



    //Conditionally display inputBox that allows user to insert word(s)
    input = (wordObj, index) => {
      if(this.state.showInputForNewWord && index == this.state.indexOfWordBeforeInsert) { //show inputBox insert 
      return (
        <input
          className='input-box'
          style={Object.assign({}, styles.inputBox, { top: `${(wordObj.speakerNo * 40) - 40}px` })}
          ref={input => this.input = input}
          value={this.state.inputText}
          onChange={this.handleTextInputChange}
          onKeyPress={this.handleTextInputOnEnter}
          type='text' /> 
        )
      }
    }

		//Conditionally display editBox that allows user to edit existing word
		edit = (wordObj, index) => {
			if(index === this.state.indexOfWordToBeEdited) { //show inputBox insert 
      return (
        <input
          className='input-box'
          style={Object.assign({}, styles.inputBox, { top: `${(wordObj.speakerNo * 40) - 40}px` })}
          ref={input => this.inputEdit = input}
          value={this.state.inputEditText}
          onChange={this.handleInputEditWord}
          onKeyPress={this.handleTextInputOnEnter}
          type='text' /> 
        )
      } else {
				return (
					<span    
						className='word'
						key={wordObj.id+wordObj.word}
						data-speaker-number={wordObj.speakerNo}
						style={Object.assign({}, styles.word, { top: `${(wordObj.speakerNo * 40) - 40}px` })}
						onClick={() => this.handleClickToEditWord(wordObj, index)}
						>{wordObj.word}
					</span> 
				)
			}
		}

		//Conditional logic for editing or display a word
		displayWordOrEditWord = (wordObj, index) => {
			if(this.state.isDisplayWord) {
				return (
					<span    
						className='word'
						key={wordObj.id+wordObj.word}
						data-speaker-number={wordObj.speakerNo}
						style={Object.assign({}, styles.word, { top: `${(wordObj.speakerNo * 40) - 40}px` })}
						onClick={() => this.handleClickToEditWord(wordObj, index)}
					>{wordObj.word}
					</span> 
				)
			} else {
				return edit(wordObj, index)
			}
		}
		//END displayWordOrEditWord
    
		return(
			<div>
			
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
									key={wordObj.id+wordObj.word}
									ref={wordDiv => this.wordDiv = wordDiv}
									style={styles.wordContainer}> 
									{displayWordOrEditWord(wordObj, i)}
									<div
										className='gap-between-words'
										onClick={() => this.handleDisplayInputBox(wordObj, i)}
                    data-speaker-number={wordObj.speakerNo}
										style={Object.assign({}, { top: `${(wordObj.speakerNo * 40) - 40}px` }, styles.addText)}>+</div>
										{input(wordObj, i)}
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
		zIndex: 5
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
		position: 'relative',
		display: 'inline-block',
		width: '30px',
		color: 'transparent',
		minHeight: '20px'
  },
  inputBox: {
    backgroundColor: 'seagreen',
    border: 'none',
    color: '#FFF',
		height: '20px',
		borderRadius: '4px',
		fontSize: '22px',
		maxWidth: 'auto',
		padding: '8px',
		position: 'relative'
  },
	word: {
		backgroundColor: 'seagreen',
		border: 'none',
		color: '#FFF',
		height: '20px',
    maxWidth: '200px',
		position: 'relative',
		zIndex: 2,
		borderRadius: '4px',
    fontSize: '22px',
		padding: '8px'
	}
}