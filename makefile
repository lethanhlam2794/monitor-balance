SHELL := /bin/bash

APP_NAME := telegram-bot

SERVER := gsw-staging
ARCHIVE_DIR := projects/archived

build:
	yarn install
	yarn build

zip: build
	echo "git: $(shell git branch --show-current) - $(shell git rev-parse HEAD)" | tee version.txt
	echo "build: $(shell date)" | tee -a version.txt
	"C:/Program Files/7-Zip/7z.exe" a -tzip ${APP_NAME}.zip dist package.json yarn.lock version.txt
	rm version.txt

publish: zip
	scp ${APP_NAME}.zip ${SERVER}:${ARCHIVE_DIR}
	rm ${APP_NAME}.zip
	ssh ${SERVER} 'sh projects/deploy.sh ${APP_NAME}'