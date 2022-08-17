FROM node:16.17.0-buster

ARG FMT='\e[1;34m%-6s\e[m\n'

RUN printf $FMT "Dependencies..." \
&& apt-get update \
&& apt-get install -y tini ruby-full ruby-sass \
&& npm install -g grunt bower \
&& printf $FMT "Get project..." \
&& cd /opt \
&& git clone https://github.com/jlblcc/json-schema-viewer.git \
&& cd /opt/json-schema-viewer \
&& printf $FMT "Build project..." \
&& bower install \
&& npm install \
&& grunt prod

WORKDIR /opt/json-schema-viewer
EXPOSE 9001

ENTRYPOINT ["tini", "--"]
CMD ["grunt", "connect:server:keepalive" ]

# vim:set ft=dockerfile:
