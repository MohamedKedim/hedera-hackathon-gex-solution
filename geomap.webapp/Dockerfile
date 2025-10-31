# -------- Base Image --------
FROM node:18-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# -------- Dependencies --------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# -------- Build --------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_PUBLIC_ONBOARDING_URL=https://auth.greenearthx.io
ENV NEXT_PUBLIC_GEOMAP_URL=https://geomap.greenearthx.io
ENV ONBOARDING_APP_URL=https://auth.greenearthx.io
ENV GEOMAP_URL=https://geomap.greenearthx.io
ENV NEXT_PUBLIC_RECAPTCHA_SITE_KEY=6LeFz3MrAAAAAAHeQFSkH9YUVpR2XDiDxTHV9957

# Accept build arguments
ARG MICROSOFT_CLIENT_ID
ARG MICROSOFT_CLIENT_SECRET  
ARG MICROSOFT_TENANT_ID
ARG MICROSOFT_REFRESH_TOKEN
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL

# Set them as environment variables for the build process
ENV MICROSOFT_CLIENT_ID=$MICROSOFT_CLIENT_ID
ENV MICROSOFT_CLIENT_SECRET=$MICROSOFT_CLIENT_SECRET
ENV MICROSOFT_TENANT_ID=$MICROSOFT_TENANT_ID  
ENV MICROSOFT_REFRESH_TOKEN=$MICROSOFT_REFRESH_TOKEN
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NEXTAUTH_URL=$NEXTAUTH_URL


RUN npm run build

# -------- Production --------
FROM base AS runner

WORKDIR /app

# Create app folder and give it permissions
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/.next/cache \
  && chown -R nextjs:nodejs /app

ENV NODE_ENV production
ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Copy only the required files for production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set user AFTER files are copied and permissions are set
USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
