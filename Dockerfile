FROM node:22-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend
WORKDIR /src
COPY server ./server
RUN dotnet publish server/API/F1RaceIntelligence.API.csproj -c Release -o /out
COPY --from=frontend /app/dist /out/wwwroot

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
ENV ASPNETCORE_HTTP_PORTS=8080
EXPOSE 8080
COPY --from=backend /out .
USER $APP_UID
ENTRYPOINT ["dotnet", "F1RaceIntelligence.API.dll"]
