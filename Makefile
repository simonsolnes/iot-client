all: main.js
	browserify main.js -o bundle.js
	rm -fr $(WEBSERVER)/iot
	cp -r ./ $(WEBSERVER)/iot

run: all
	python -m SimpleHTTPServer

clean:
	rm -f bundle.js
