FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN apk add --no-cache python3 make g++ pkgconfig cairo-dev pango-dev jpeg-dev giflib-dev librsvg-dev \
	&& npm install

COPY . ./

RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist /app/dist
COPY serve.json /app/serve.json
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/entrypoint.sh"]