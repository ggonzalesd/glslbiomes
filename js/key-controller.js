"use strict";

class KeyController{
	constructor(){
		this.keyArray = [];
	}

	catchKey(key){
		if(this.keyArray.findIndex(x => x['key'] == key) == -1){
			this.keyArray.push({key:key, counter:-1});
		}
	}

	update(){
		this.keyArray.forEach(x => {
			x['counter']++;
		});
	}

	keyOnce(key){
		const some = this.keyArray.find(x => x['key'] == key);
		return some!=null?some['counter']==0:false;
	}

	keyHold(key){
		const some = this.keyArray.find(x => x['key'] == key);
		return some!=null?some['counter']>=0:false;
	}

	dropKey(key){
		if(this.keyArray.findIndex(x => x['key'] == key) != -1){
			this.keyArray = this.keyArray.filter( x => x['key']!=key);
		}
	}
};


export {
	KeyController
};