#!/usr/bin/env node

'use strict';

var raml2obj = require('raml2obj');
var handlebars = require('handlebars');
var program = require('commander');
var fs = require('fs');

// Escape curly braces
handlebars.registerHelper('wikisafe', function(origStr) {
	var newStr = origStr.replace(/([*+?^=!${}])/g, "\\$1");
	//newStr = newStr.replace('}',"\\" + "}"); 
	return newStr;
});

// Convert booleans into Tick and Cross emote
handlebars.registerHelper('emote', function(origBool) {
	var newStr;
	if (origBool == true) {
		newStr = 'X';
	}
	if (origBool == false) {
		newStr = '';
	}


	return newStr;
});

// Parste the Parameter to get OData specifics
handlebars.registerHelper('parseParamName', function(origStr) {
	var newStr = origStr;

	// Check for Key Field indicator
	this.$isKey = false;
	if (origStr.indexOf("[[isKey]]") > -1) {
		this.$isKey = true;
		newStr = newStr.replace("[[isKey]]", "");
	}

	// Check if we have a complex type
	this.$isStructure = false;
	this.$type = this.type;
	if (origStr.charAt(0) == "/") {
		this.$isStructure = true;
		this.$type = "complex";
	}

	// Check if a custom Type is specified
	var startType = origStr.indexOf("(");
	if (startType > -1) {
		var endType = origStr.indexOf(")");

		if (endType == -1) {
			console.log("Type not correct specified, ) is missing:" + origStr);
		} else {
			this.$type = origStr.substring(startType + 1, endType);
			newStr = newStr.replace("(" + this.$type + ")", "");
		}
	}

	// Remove leading / for Entity types
	newStr = newStr.replace("//", "/");
	return newStr;
});

// Log the context
handlebars.registerHelper('context', function(origStr) {
	console.log(JSON.stringify(this));
});

// Relative Uri without parameters
handlebars.registerHelper('uriWithoutParameters', function(origStr) {
	var newStr = origStr.substring(0, origStr.indexOf("("));
	return newStr;
});

// Adjust type, when property name starts wit /
handlebars.registerHelper('structure', function(origStr) {
	if (this.displayName.charAt(0) == "/") {
		return "complex";
	}
	return origStr;
});

function _render(ramlObj, config, onSuccess) {
	ramlObj.config = config;



	// Register handlebar partials
	for (var partialName in config.partials) {
		if (config.partials.hasOwnProperty(partialName)) {
			handlebars.registerPartial(partialName, config.partials[partialName]);
		}
	}

	var result = config.template(ramlObj);
	onSuccess(result);
}

function parseWithConfig(source, config, onSuccess, onError) {
	raml2obj.parse(source, function(ramlObj) {
		debugger;
		_render(ramlObj, config, onSuccess);
	});
}

function parse(source, onSuccess, onError) {
	var config = {
		'template': require('./template.handlebars'),
		'partials': {
			'resource': require('./resource.handlebars')
		}
	};

	parseWithConfig(source, config, onSuccess, onError);
}


if (require.main === module) {
	debugger;
	program
		.usage('[options] [RAML input file]')
		.option('-i, --input [input]', 'RAML input file')
		.option('-o, --output [output]', 'Wiki Markup output file')
		.parse(process.argv);

	var input = program.input;

	if (!input) {
		if (program.args.length !== 1) {
			console.error('Error: You need to specify the RAML input file');
			program.help();
			process.exit(1);
		}

		input = program.args[0];
	}

	// Start the parsing process
	parse(input, function(result) {
		if (program.output) {
			fs.writeFileSync(program.output, result);
		} else {
			// Simply output to console
			process.stdout.write(result);
			process.exit(0);
		}
	}, function(error) {
		console.log('Error parsing: ' + error);
		process.exit(1);
	});
}


module.exports.parse = parse;
module.exports.parseWithConfig = parseWithConfig;
module.exports.handlebars = handlebars;