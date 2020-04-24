clean:
	rm -rf ./dist

dist:
	docker run --rm -it -v `pwd`:/action  node:12 /bin/sh -c "cd action && yarn install && yarn build && yarn ncc && chown -R `id -u`:`id -g` dist"