FROM node:20-bookworm-slim

# Copy the tarball (built with npm pack)
COPY infinite-realms-*.tgz /tmp/package.tgz

# Install globally from tarball
RUN npm install -g /tmp/package.tgz && rm /tmp/package.tgz

EXPOSE 3000

# Start the CLI — PGlite handles the database internally
CMD ["infinite-realms"]
