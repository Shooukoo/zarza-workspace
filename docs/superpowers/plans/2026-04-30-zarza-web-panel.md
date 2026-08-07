# Zarza AI Web Panel Implementation Plan

**Spec relacionado:** [[2026-04-30-zarza-web-panel-design]]

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `zarza-web/`, a React + Vite SPA with Ant Design covering Dashboard, Campos, and Solicitudes modules with role-based access for all four system roles, plus 5 targeted changes to `fruit-backend` to support httpOnly cookie auth, a `/auth/me` endpoint, productor-scoped dashboard, and a role filter on the users list.

**Architecture:** New `zarza-web/` folder at monorepo root. React Router v6 for role-guarded routes using a `PrivateRoute` HOC with `<Outlet />`. TanStack Query v5 for data fetching and cache. Axios with `withCredentials: true` for automatic cookie forwarding. Vite dev server proxy forwards `/api/*` to `fruit-backend`. Backend changes are non-breaking additions — no existing behavior changes.

**Tech Stack:** React 18, Vite 6, TypeScript 5, React Router v6, TanStack Query v5, Axios 1, Ant Design 5, Recharts 2 (frontend) · NestJS 11 + Fastify 5 + @fastify/cookie (backend).

---

## File Map

### fruit-backend — modified files
| File | Change |
|------|--------|
| `fruit-backend/src/main.ts` | Register `@fastify/cookie`; set `credentials: true` in CORS |
| `fruit-backend/src/auth/infrastructure/http/guards/jwt-auth.guard.ts` | Extract token from cookie as fallback when no `Authorization` header |
| `fruit-backend/src/auth/infrastructure/http/auth.controller.ts` | Add `GET /auth/me`, `POST /auth/logout`; update `POST /auth/login` to set httpOnly cookie |
| `fruit-backend/src/admin/admin.service.ts` | Add optional `role` param to `findAllUsers()` |
| `fruit-backend/src/admin/admin.controller.ts` | Pass `?rol` to `findAllUsers()`; open dashboard endpoints to `PRODUCTOR`; pass `productorId` to dashboard service |
| `fruit-backend/src/admin/admin-dashboard.service.ts` | Add optional `productorId` filter to all three pipeline methods |

### zarza-web — new files
```
zarza-web/
├── package.json
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── index.html
├── vite.config.ts
├── Dockerfile
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── api/
    │   └── client.ts
    ├── auth/
    │   ├── types.ts
    │   ├── AuthContext.tsx
    │   ├── useAuth.ts
    │   ├── PrivateRoute.tsx
    │   └── LoginPage.tsx
    ├── shared/
    │   ├── AppShell.tsx
    │   ├── Forbidden403Page.tsx
    │   └── NotFound404Page.tsx
    ├── dashboard/
    │   ├── hooks/
    │   │   └── useDashboard.ts
    │   └── DashboardPage.tsx
    ├── campos/
    │   ├── hooks/
    │   │   └── useCampos.ts
    │   ├── CreateCampoModal.tsx
    │   └── CamposPage.tsx
    └── solicitudes/
        ├── hooks/
        │   └── useSolicitudes.ts
        ├── EstadoBadge.tsx
        ├── UpdateEstadoDropdown.tsx
        ├── CreateSolicitudModal.tsx
        └── SolicitudesPage.tsx
```

### Root — modified
| File | Change |
|------|--------|
| `docker-compose.yml` | Add `zarza-web` service on port 5173 |

---

## Task 1: Install @fastify/cookie and update CORS + cookie plugin in fruit-backend

**Files:**
- Modify: `fruit-backend/src/main.ts`

- [ ] **Step 1: Install @fastify/cookie**

```bash
cd fruit-backend
pnpm add @fastify/cookie
```

- [ ] **Step 2: Update main.ts**

Replace the full content of `fruit-backend/src/main.ts`:

```typescript
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { WsAdapter } from '@nestjs/platform-ws';
import { AppModule } from './app.module';
import multipart from '@fastify/multipart';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import { envs } from './config/envs';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.register(helmet as any);
  await app.register(cookie as any);

  const corsOrigins = (process.env['CORS_ORIGIN'] || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim());

  await app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Authorization',
    credentials: true,
  });

  app.useWebSocketAdapter(new WsAdapter(app));

  await app.register(multipart as any, {
    limits: {
      fieldNameSize: 100,
      fieldSize: 1000000,
      fields: 10,
      fileSize: 5000000,
      files: 1,
      headerPairs: 2000,
    },
  });

  await app.listen(envs.port, '0.0.0.0');
  console.log(`App running on port ${envs.port}`);
}
bootstrap();
```

- [ ] **Step 3: Verify build**

```bash
cd fruit-backend
pnpm run build
```

Expected: no TypeScript errors, `dist/` produced.

- [ ] **Step 4: Commit**

```bash
git add fruit-backend/src/main.ts fruit-backend/package.json fruit-backend/pnpm-lock.yaml
git commit -m "feat(fruit-backend): install @fastify/cookie and enable credentials in CORS"
```

---

## Task 2: Update JwtAuthGuard to extract token from cookie

**Files:**
- Modify: `fruit-backend/src/auth/infrastructure/http/guards/jwt-auth.guard.ts`

- [ ] **Step 1: Replace file content**

```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import type { ITokenPort } from '../../../ports/token.port';
import { FastifyRequest } from 'fastify';
import { I_TOKEN_PORT } from '../../../ports/token.port';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(I_TOKEN_PORT) private readonly tokenService: ITokenPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<FastifyRequest & { user?: any; cookies?: Record<string, string> }>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Token not found');
    }

    try {
      const payload = await this.tokenService.verifyToken(token);
      request.user = payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
    return true;
  }

  private extractToken(
    request: FastifyRequest & { cookies?: Record<string, string> },
  ): string | undefined {
    const fromHeader = this.extractTokenFromHeader(request);
    if (fromHeader) return fromHeader;
    return request.cookies?.access_token;
  }

  private extractTokenFromHeader(request: FastifyRequest): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd fruit-backend
pnpm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add fruit-backend/src/auth/infrastructure/http/guards/jwt-auth.guard.ts
git commit -m "feat(fruit-backend): read JWT from cookie as fallback in JwtAuthGuard"
```

---

## Task 3: Add GET /auth/me, POST /auth/logout; update POST /auth/login to set cookie

**Files:**
- Modify: `fruit-backend/src/auth/infrastructure/http/auth.controller.ts`

- [ ] **Step 1: Replace file content**

```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Inject,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { AuthService } from '../../application/auth.service';
import {
  UserAlreadyExistsError,
  InvalidCredentialsError,
} from '../../domain/errors/auth.errors';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Role } from '../../domain/enums/role.enum';

export const AUTH_SERVICE = Symbol('AUTH_SERVICE');

const COOKIE_NAME = 'access_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SERVICE) private readonly authService: AuthService,
  ) {}

  @Post('register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async register(@Body() registerDto: RegisterDto) {
    try {
      return await this.authService.register(
        registerDto.email,
        registerDto.password,
      );
    } catch (error) {
      if (error instanceof UserAlreadyExistsError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    try {
      const result = await this.authService.login(
        loginDto.email,
        loginDto.password,
      );
      reply.setCookie(COOKIE_NAME, result.token, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: COOKIE_MAX_AGE,
      });
      return result;
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        throw new UnauthorizedException('Invalid email or password');
      }
      throw error;
    }
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    // req.user is the JwtPayload set by JwtAuthGuard: { sub, email, role }
    return req.user;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) reply: FastifyReply) {
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return { message: 'Logged out' };
  }
}
```

- [ ] **Step 2: Verify build**

```bash
cd fruit-backend
pnpm run build
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add fruit-backend/src/auth/infrastructure/http/auth.controller.ts
git commit -m "feat(fruit-backend): add GET /auth/me, POST /auth/logout; set httpOnly cookie on login"
```

---

## Task 4: Add optional role filter to GET /admin/users

**Files:**
- Modify: `fruit-backend/src/admin/admin.service.ts`
- Modify: `fruit-backend/src/admin/admin.controller.ts`

- [ ] **Step 1: Update findAllUsers in admin.service.ts**

Change the `findAllUsers` method signature and the `find` / `countDocuments` queries to accept an optional `role` filter. Replace only the method — leave everything else in the file unchanged:

```typescript
async findAllUsers(
  page = 1,
  limit = 20,
  role?: Role,
): Promise<{ data: UserSummary[]; total: number; page: number; limit: number }> {
  const skip = (page - 1) * limit;
  const query = role ? { role } : {};

  const [docs, total] = await Promise.all([
    this.userModel
      .find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean<{ _id: any; email: string; role: Role; createdAt: Date }[]>()
      .exec(),
    this.userModel.countDocuments(query).exec(),
  ]);

  const analysisCounts = await this.analysisModel
    .aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$requester.userId', count: { $sum: 1 } } },
    ])
    .exec();
  const countMap = new Map(
    analysisCounts.map(({ _id, count }) => [_id, count]),
  );

  const data = docs.map((d) => {
    const id = d._id.toString();
    return {
      id,
      email: d.email,
      role: d.role,
      createdAt: d.createdAt,
      totalAnalyses: countMap.get(id) ?? 0,
    };
  });

  return { data, total, page, limit };
}
```

- [ ] **Step 2: Update the GET /admin/users handler in admin.controller.ts**

Replace only the `findAllUsers` handler — leave everything else in the file unchanged:

```typescript
@Get('users')
findAllUsers(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  @Query('rol') rol?: string,
) {
  const role =
    rol && Object.values(Role).includes(rol as Role)
      ? (rol as Role)
      : undefined;
  return this.adminService.findAllUsers(page, limit, role);
}
```

- [ ] **Step 3: Verify build**

```bash
cd fruit-backend
pnpm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add fruit-backend/src/admin/admin.service.ts fruit-backend/src/admin/admin.controller.ts
git commit -m "feat(fruit-backend): add ?rol query param to GET /admin/users"
```

---

## Task 5: Open dashboard endpoints to PRODUCTOR and filter by productor_id

**Files:**
- Modify: `fruit-backend/src/admin/admin-dashboard.service.ts`
- Modify: `fruit-backend/src/admin/admin.controller.ts`

- [ ] **Step 1: Replace admin-dashboard.service.ts**

```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AnalysisDashboardDocument } from './schemas/analysis.schema';

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectModel(AnalysisDashboardDocument.name)
    private readonly analysisModel: Model<AnalysisDashboardDocument>,
  ) {}

  async getYieldForecast(productorId?: string) {
    const pipeline: any[] = [];
    if (productorId) {
      pipeline.push({ $match: { productor_id: new Types.ObjectId(productorId) } });
    }
    pipeline.push(
      { $unwind: '$cronograma_fenologico' },
      {
        $match: {
          $or: [
            { 'cronograma_fenologico.etapa': 'maduro' },
            { 'cronograma_fenologico.prediccion.cambio_a': 'maduro' },
          ],
        },
      },
      {
        $group: {
          _id: '$cronograma_fenologico.prediccion.dias_para_cosecha',
          totalGrams: { $sum: '$proyeccion_financiera.peso_sano_gramos' },
        },
      },
      { $sort: { _id: 1 } },
    );

    const result = await this.analysisModel.aggregate(pipeline).exec();
    return result.map((item) => ({
      daysToHarvest: item._id || 0,
      estimatedWeightGrams: item.totalGrams,
    }));
  }

  async getHealthMetrics(productorId?: string) {
    const pipeline: any[] = [];
    if (productorId) {
      pipeline.push({ $match: { productor_id: new Types.ObjectId(productorId) } });
    }
    pipeline.push({
      $group: {
        _id: null,
        avgLossPercent: { $avg: '$metricas_salud.porcentaje_merma_general' },
        totalSickCount: { $sum: '$metricas_salud.elementos_enfermos' },
        totalHealthyCount: { $sum: '$metricas_salud.elementos_sanos' },
        totalDetected: { $sum: '$metricas_salud.total_elementos_detectados' },
      },
    });

    const result = await this.analysisModel.aggregate(pipeline).exec();
    if (!result.length) {
      return { avgLossPercent: 0, totalSickCount: 0, totalHealthyCount: 0, totalDetected: 0 };
    }
    const doc = result[0];
    return {
      avgLossPercent: doc.avgLossPercent,
      totalSickCount: doc.totalSickCount,
      totalHealthyCount: doc.totalHealthyCount,
      totalDetected: doc.totalDetected,
    };
  }

  async getPhenologyDistribution(productorId?: string) {
    const pipeline: any[] = [];
    if (productorId) {
      pipeline.push({ $match: { productor_id: new Types.ObjectId(productorId) } });
    }
    pipeline.push(
      { $unwind: '$cronograma_fenologico' },
      {
        $group: {
          _id: '$cronograma_fenologico.etapa',
          count: { $sum: '$cronograma_fenologico.cantidad' },
        },
      },
      { $sort: { count: -1 } },
    );

    const result = await this.analysisModel.aggregate(pipeline).exec();
    return result.map((item) => ({ stage: item._id, count: item.count }));
  }
}
```

- [ ] **Step 2: Update dashboard handlers in admin.controller.ts**

Add `Req` to the NestJS imports at the top of the file:

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
```

Replace the three dashboard handlers (leave all other handlers untouched):

```typescript
@Get('dashboard/yield')
@Roles(Role.ADMIN, Role.PRODUCTOR)
getYieldForecast(@Req() req: any) {
  const productorId =
    req.user?.role === Role.PRODUCTOR ? req.user.sub : undefined;
  return this.dashboardService.getYieldForecast(productorId);
}

@Get('dashboard/health')
@Roles(Role.ADMIN, Role.PRODUCTOR)
getHealthMetrics(@Req() req: any) {
  const productorId =
    req.user?.role === Role.PRODUCTOR ? req.user.sub : undefined;
  return this.dashboardService.getHealthMetrics(productorId);
}

@Get('dashboard/phenology')
@Roles(Role.ADMIN, Role.PRODUCTOR)
getPhenologyDistribution(@Req() req: any) {
  const productorId =
    req.user?.role === Role.PRODUCTOR ? req.user.sub : undefined;
  return this.dashboardService.getPhenologyDistribution(productorId);
}
```

- [ ] **Step 3: Verify build**

```bash
cd fruit-backend
pnpm run build
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add fruit-backend/src/admin/admin-dashboard.service.ts fruit-backend/src/admin/admin.controller.ts
git commit -m "feat(fruit-backend): open dashboard endpoints to PRODUCTOR with per-productor filtering"
```

---

## Task 6: Scaffold zarza-web project files

**Files:** All new under `zarza-web/`

- [ ] **Step 1: Create zarza-web/package.json**

```json
{
  "name": "zarza-web",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@ant-design/icons": "^5.5.2",
    "@tanstack/react-query": "^5.62.0",
    "antd": "^5.22.0",
    "axios": "^1.7.9",
    "dayjs": "^1.11.13",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.14.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.3",
    "vite": "^6.0.11"
  }
}
```

- [ ] **Step 2: Create zarza-web/tsconfig.json**

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

- [ ] **Step 3: Create zarza-web/tsconfig.app.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create zarza-web/tsconfig.node.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2023"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: Create zarza-web/index.html**

```html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Zarza AI Panel</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 6: Create zarza-web/vite.config.ts**

```typescript
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: env['VITE_API_TARGET'] || 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  };
});
```

- [ ] **Step 7: Create zarza-web/Dockerfile**

```dockerfile
# ── dev stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ── build stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ── prod stage ────────────────────────────────────────────────────────────────
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 8: Install dependencies**

```bash
cd zarza-web
npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 9: Commit**

```bash
git add zarza-web/
git commit -m "feat(zarza-web): scaffold Vite + React + TypeScript + Ant Design project"
```

---

## Task 7: Add zarza-web service to docker-compose.yml

**Files:**
- Modify: `docker-compose.yml`

- [ ] **Step 1: Add service**

Add the following block to `docker-compose.yml` after the `fruit-ms` service, before the `networks:` section:

```yaml
  # ── Panel web (React + Vite) ─────────────────────────────────────────────────
  zarza-web:
    build:
      context: ./zarza-web
      target: dev
    ports:
      - "5173:5173"
    volumes:
      - ./zarza-web:/app
      - /app/node_modules
    environment:
      VITE_API_TARGET: http://fruit-backend:3000
    depends_on:
      - fruit-backend
    networks: [fruit-net]
```

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): add zarza-web service on port 5173"
```

---

## Task 8: Create API client

**Files:**
- Create: `zarza-web/src/api/client.ts`

- [ ] **Step 1: Create src/api/client.ts**

```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Redirect to /login on any 401 response
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

- [ ] **Step 2: Commit**

```bash
git add zarza-web/src/api/client.ts
git commit -m "feat(zarza-web): add Axios client with withCredentials and 401 interceptor"
```

---

## Task 9: Create auth layer (types, context, hook, PrivateRoute)

**Files:**
- Create: `zarza-web/src/auth/types.ts`
- Create: `zarza-web/src/auth/AuthContext.tsx`
- Create: `zarza-web/src/auth/useAuth.ts`
- Create: `zarza-web/src/auth/PrivateRoute.tsx`

- [ ] **Step 1: Create src/auth/types.ts**

```typescript
export enum Role {
  ADMIN = 'ADMIN',
  PRODUCTOR = 'PRODUCTOR',
  AGRONOMO = 'AGRONOMO',
  MONITOR = 'MONITOR',
}

export interface AuthUser {
  sub: string;
  email: string;
  role: Role;
}
```

- [ ] **Step 2: Create src/auth/AuthContext.tsx**

```typescript
import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { apiClient } from '../api/client';
import { AuthUser, Role } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate session from existing cookie on mount
  useEffect(() => {
    apiClient
      .get<AuthUser>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    // Backend returns { user: { id, email, role } } — normalize id → sub to match AuthUser
    const res = await apiClient.post<{
      user: { id: string; email: string; role: Role };
    }>('/auth/login', { email, password });
    const u = res.data.user;
    setUser({ sub: u.id, email: u.email, role: u.role });
  }

  async function logout() {
    await apiClient.post('/auth/logout');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside AuthProvider');
  return ctx;
}
```

- [ ] **Step 3: Create src/auth/useAuth.ts**

```typescript
export { useAuthContext as useAuth } from './AuthContext';
```

- [ ] **Step 4: Create src/auth/PrivateRoute.tsx**

```typescript
import { Navigate, Outlet } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from './useAuth';
import { Role } from './types';

interface PrivateRouteProps {
  allowedRoles?: Role[];
}

export function PrivateRoute({ allowedRoles }: PrivateRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <Spin size="large" fullscreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
```

- [ ] **Step 5: Commit**

```bash
git add zarza-web/src/auth/
git commit -m "feat(zarza-web): add auth types, AuthContext, useAuth hook, and PrivateRoute"
```

---

## Task 10: Create LoginPage

**Files:**
- Create: `zarza-web/src/auth/LoginPage.tsx`

- [ ] **Step 1: Create src/auth/LoginPage.tsx**

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Card, Typography, notification } from 'antd';
import { useAuth } from './useAuth';

const { Title } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onFinish(values: LoginFormValues) {
    setLoading(true);
    try {
      await login(values.email, values.password);
      navigate('/dashboard', { replace: true });
    } catch {
      notification.error({
        message: 'Credenciales incorrectas',
        description: 'Verifica tu email y contraseña.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f0f2f5',
      }}
    >
      <Card style={{ width: 380 }}>
        <Title level={3} style={{ textAlign: 'center', marginBottom: 24 }}>
          Zarza AI Panel
        </Title>
        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: 'Ingresa tu email' },
              { type: 'email', message: 'Email inválido' },
            ]}
          >
            <Input placeholder="admin@zarza.io" />
          </Form.Item>
          <Form.Item
            label="Contraseña"
            name="password"
            rules={[{ required: true, message: 'Ingresa tu contraseña' }]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" loading={loading} block>
              Iniciar sesión
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add zarza-web/src/auth/LoginPage.tsx
git commit -m "feat(zarza-web): add LoginPage with Ant Design form"
```

---

## Task 11: Create AppShell and shared error pages

**Files:**
- Create: `zarza-web/src/shared/AppShell.tsx`
- Create: `zarza-web/src/shared/Forbidden403Page.tsx`
- Create: `zarza-web/src/shared/NotFound404Page.tsx`

- [ ] **Step 1: Create src/shared/AppShell.tsx**

```typescript
import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Typography, Space, notification } from 'antd';
import {
  DashboardOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const NAV_ITEMS = [
  {
    key: '/dashboard',
    label: 'Dashboard',
    icon: <DashboardOutlined />,
    roles: [Role.ADMIN, Role.PRODUCTOR],
  },
  {
    key: '/campos',
    label: 'Campos / Huertas',
    icon: <EnvironmentOutlined />,
    roles: [Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO],
  },
  {
    key: '/solicitudes',
    label: 'Solicitudes',
    icon: <FileTextOutlined />,
    roles: [Role.ADMIN, Role.AGRONOMO, Role.MONITOR],
  },
];

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && item.roles.includes(user.role),
  ).map(({ key, label, icon }) => ({ key, label, icon }));

  async function handleLogout() {
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch {
      notification.error({ message: 'Error al cerrar sesión' });
    }
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div
          style={{
            height: 48,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: collapsed ? 14 : 18,
            padding: '0 16px',
          }}
        >
          {collapsed ? 'ZA' : 'Zarza AI'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={visibleItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 16,
          }}
        >
          <Space>
            <Text>{user?.email}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {user?.role}
            </Text>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={handleLogout}
            >
              Salir
            </Button>
          </Space>
        </Header>

        <Content style={{ margin: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

- [ ] **Step 2: Create src/shared/Forbidden403Page.tsx**

```typescript
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export function Forbidden403Page() {
  const navigate = useNavigate();
  return (
    <Result
      status="403"
      title="403"
      subTitle="No tienes permiso para ver esta página."
      extra={
        <Button type="primary" onClick={() => navigate(-1)}>
          Volver
        </Button>
      }
    />
  );
}
```

- [ ] **Step 3: Create src/shared/NotFound404Page.tsx**

```typescript
import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';

export function NotFound404Page() {
  const navigate = useNavigate();
  return (
    <Result
      status="404"
      title="404"
      subTitle="La página que buscas no existe."
      extra={
        <Button type="primary" onClick={() => navigate('/')}>
          Ir al inicio
        </Button>
      }
    />
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add zarza-web/src/shared/
git commit -m "feat(zarza-web): add AppShell with sidebar and 403/404 error pages"
```

---

## Task 12: Wire App.tsx and main.tsx

**Files:**
- Create: `zarza-web/src/App.tsx`
- Create: `zarza-web/src/main.tsx`

- [ ] **Step 1: Create src/App.tsx**

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { PrivateRoute } from './auth/PrivateRoute';
import { LoginPage } from './auth/LoginPage';
import { AppShell } from './shared/AppShell';
import { Forbidden403Page } from './shared/Forbidden403Page';
import { NotFound404Page } from './shared/NotFound404Page';
import { DashboardPage } from './dashboard/DashboardPage';
import { CamposPage } from './campos/CamposPage';
import { SolicitudesPage } from './solicitudes/SolicitudesPage';
import { Role } from './auth/types';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/403" element={<Forbidden403Page />} />

      {/* Authenticated shell */}
      <Route element={<PrivateRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route
            element={
              <PrivateRoute allowedRoles={[Role.ADMIN, Role.PRODUCTOR]} />
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          <Route
            element={
              <PrivateRoute
                allowedRoles={[Role.ADMIN, Role.PRODUCTOR, Role.AGRONOMO]}
              />
            }
          >
            <Route path="/campos" element={<CamposPage />} />
          </Route>

          <Route
            element={
              <PrivateRoute
                allowedRoles={[Role.ADMIN, Role.AGRONOMO, Role.MONITOR]}
              />
            }
          >
            <Route path="/solicitudes" element={<SolicitudesPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound404Page />} />
    </Routes>
  );
}
```

- [ ] **Step 2: Create src/main.tsx**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfigProvider } from 'antd';
import esES from 'antd/locale/es_ES';
import { AuthProvider } from './auth/AuthContext';
import { App } from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider locale={esES}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd zarza-web
npm run build
```

Expected: no errors (DashboardPage, CamposPage, SolicitudesPage don't exist yet — add placeholder exports before running build, or run this step after Task 15).

> **Note:** Run `npm run build` only after Tasks 13, 14, and 15 are complete.

- [ ] **Step 4: Commit**

```bash
git add zarza-web/src/App.tsx zarza-web/src/main.tsx
git commit -m "feat(zarza-web): wire React Router routes and QueryClient in main.tsx"
```

---

## Task 13: Dashboard module

**Files:**
- Create: `zarza-web/src/dashboard/hooks/useDashboard.ts`
- Create: `zarza-web/src/dashboard/DashboardPage.tsx`

- [ ] **Step 1: Create src/dashboard/hooks/useDashboard.ts**

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export interface YieldPoint {
  daysToHarvest: number;
  estimatedWeightGrams: number;
}

export interface HealthMetrics {
  avgLossPercent: number;
  totalSickCount: number;
  totalHealthyCount: number;
  totalDetected: number;
}

export interface PhenologyPoint {
  stage: string;
  count: number;
}

export function useYieldForecast() {
  return useQuery<YieldPoint[]>({
    queryKey: ['dashboard', 'yield'],
    queryFn: () =>
      apiClient
        .get<YieldPoint[]>('/admin/dashboard/yield')
        .then((r) => r.data),
  });
}

export function useHealthMetrics() {
  return useQuery<HealthMetrics>({
    queryKey: ['dashboard', 'health'],
    queryFn: () =>
      apiClient
        .get<HealthMetrics>('/admin/dashboard/health')
        .then((r) => r.data),
  });
}

export function usePhenologyDistribution() {
  return useQuery<PhenologyPoint[]>({
    queryKey: ['dashboard', 'phenology'],
    queryFn: () =>
      apiClient
        .get<PhenologyPoint[]>('/admin/dashboard/phenology')
        .then((r) => r.data),
  });
}
```

- [ ] **Step 2: Create src/dashboard/DashboardPage.tsx**

```typescript
import { Card, Col, Row, Statistic, Typography, Spin } from 'antd';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  useYieldForecast,
  useHealthMetrics,
  usePhenologyDistribution,
} from './hooks/useDashboard';

const { Title } = Typography;

const PIE_COLORS = [
  '#52c41a',
  '#1890ff',
  '#faad14',
  '#f5222d',
  '#722ed1',
  '#13c2c2',
  '#eb2f96',
];

export function DashboardPage() {
  const yieldQuery = useYieldForecast();
  const healthQuery = useHealthMetrics();
  const phenologyQuery = usePhenologyDistribution();

  return (
    <div>
      <Title level={4} style={{ marginBottom: 24 }}>
        Dashboard
      </Title>

      {/* Health Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="% Merma promedio"
              value={healthQuery.data?.avgLossPercent ?? 0}
              precision={1}
              suffix="%"
              loading={healthQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Elementos detectados"
              value={healthQuery.data?.totalDetected ?? 0}
              loading={healthQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Elementos sanos"
              value={healthQuery.data?.totalHealthyCount ?? 0}
              valueStyle={{ color: '#52c41a' }}
              loading={healthQuery.isLoading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Elementos enfermos"
              value={healthQuery.data?.totalSickCount ?? 0}
              valueStyle={{ color: '#f5222d' }}
              loading={healthQuery.isLoading}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        {/* Yield Forecast Bar Chart */}
        <Col xs={24} lg={14}>
          <Card title="Proyección de Cosecha (días → gramos sanos)">
            {yieldQuery.isLoading ? (
              <Spin />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={yieldQuery.data ?? []}>
                  <XAxis
                    dataKey="daysToHarvest"
                    label={{
                      value: 'Días para cosecha',
                      position: 'insideBottom',
                      offset: -4,
                    }}
                  />
                  <YAxis
                    label={{
                      value: 'Gramos sanos',
                      angle: -90,
                      position: 'insideLeft',
                    }}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v} g`, 'Peso estimado']}
                  />
                  <Bar dataKey="estimatedWeightGrams" fill="#52c41a" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* Phenology Donut */}
        <Col xs={24} lg={10}>
          <Card title="Distribución Fenológica">
            {phenologyQuery.isLoading ? (
              <Spin />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={phenologyQuery.data ?? []}
                    dataKey="count"
                    nameKey="stage"
                    innerRadius="50%"
                    outerRadius="75%"
                    paddingAngle={3}
                  >
                    {(phenologyQuery.data ?? []).map((_, i) => (
                      <Cell
                        key={i}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, 'Cantidad']} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add zarza-web/src/dashboard/
git commit -m "feat(zarza-web): add Dashboard module with yield, health, and phenology charts"
```

---

## Task 14: Campos module

**Files:**
- Create: `zarza-web/src/campos/hooks/useCampos.ts`
- Create: `zarza-web/src/campos/CreateCampoModal.tsx`
- Create: `zarza-web/src/campos/CamposPage.tsx`

- [ ] **Step 1: Create src/campos/hooks/useCampos.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

export interface Campo {
  _id: string;
  codigo_campo: string;
  nombre: string;
  productor_id: string;
  createdAt: string;
}

export interface UserOption {
  id: string;
  email: string;
}

export function useCampos() {
  return useQuery<Campo[]>({
    queryKey: ['campos'],
    queryFn: () => apiClient.get<Campo[]>('/campos').then((r) => r.data),
  });
}

export function useProductores() {
  return useQuery<UserOption[]>({
    queryKey: ['admin', 'users', 'PRODUCTOR'],
    queryFn: () =>
      apiClient
        .get<{ data: UserOption[] }>('/admin/users?rol=PRODUCTOR&limit=200')
        .then((r) => r.data.data),
  });
}

export function useCreateCampo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      codigo_campo: string;
      nombre: string;
      productor_id: string;
    }) => apiClient.post<Campo>('/campos', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campos'] }),
  });
}

export function useDeleteCampo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/campos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['campos'] }),
  });
}
```

- [ ] **Step 2: Create src/campos/CreateCampoModal.tsx**

```typescript
import { Modal, Form, Input, Select, notification } from 'antd';
import { useCreateCampo, useProductores } from './hooks/useCampos';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  codigo_campo: string;
  nombre: string;
  productor_id?: string;
}

export function CreateCampoModal({ open, onClose }: Props) {
  const { user } = useAuth();
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateCampo();
  const productoresQuery = useProductores();
  const isAdmin = user?.role === Role.ADMIN;

  async function onFinish(values: FormValues) {
    const productor_id = isAdmin ? values.productor_id! : user!.sub;
    try {
      await createMutation.mutateAsync({
        codigo_campo: values.codigo_campo,
        nombre: values.nombre,
        productor_id,
      });
      notification.success({ message: 'Campo creado exitosamente' });
      form.resetFields();
      onClose();
    } catch {
      notification.error({ message: 'Error al crear campo' });
    }
  }

  return (
    <Modal
      title="Nuevo Campo / Huerta"
      open={open}
      onOk={form.submit}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      confirmLoading={createMutation.isPending}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="Código"
          name="codigo_campo"
          rules={[{ required: true, message: 'Ingresa el código del campo' }]}
        >
          <Input placeholder="C-001" />
        </Form.Item>

        <Form.Item
          label="Nombre"
          name="nombre"
          rules={[{ required: true, message: 'Ingresa el nombre del campo' }]}
        >
          <Input placeholder="Huerta Norte" />
        </Form.Item>

        {isAdmin && (
          <Form.Item
            label="Productor"
            name="productor_id"
            rules={[{ required: true, message: 'Selecciona un productor' }]}
          >
            <Select
              loading={productoresQuery.isLoading}
              placeholder="Selecciona productor"
              options={(productoresQuery.data ?? []).map((u) => ({
                value: u.id,
                label: u.email,
              }))}
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
```

- [ ] **Step 3: Create src/campos/CamposPage.tsx**

```typescript
import { useState } from 'react';
import {
  Button,
  Popconfirm,
  Space,
  Table,
  Typography,
  notification,
} from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useCampos, useDeleteCampo, type Campo } from './hooks/useCampos';
import { CreateCampoModal } from './CreateCampoModal';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';

const { Title } = Typography;

export function CamposPage() {
  const { user } = useAuth();
  const camposQuery = useCampos();
  const deleteMutation = useDeleteCampo();
  const [modalOpen, setModalOpen] = useState(false);

  const canCreate = user?.role === Role.ADMIN || user?.role === Role.PRODUCTOR;
  const canDelete = user?.role === Role.ADMIN;

  async function handleDelete(id: string) {
    try {
      await deleteMutation.mutateAsync(id);
      notification.success({ message: 'Campo eliminado' });
    } catch {
      notification.error({ message: 'Error al eliminar campo' });
    }
  }

  const columns: ColumnsType<Campo> = [
    { title: 'Código', dataIndex: 'codigo_campo', key: 'codigo_campo' },
    { title: 'Nombre', dataIndex: 'nombre', key: 'nombre' },
    {
      title: 'Productor ID',
      dataIndex: 'productor_id',
      key: 'productor_id',
      ellipsis: true,
    },
    {
      title: 'Alta',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString('es-MX'),
    },
    ...(canDelete
      ? [
          {
            title: 'Acciones',
            key: 'actions',
            render: (_: unknown, record: Campo) => (
              <Popconfirm
                title="¿Eliminar este campo?"
                onConfirm={() => handleDelete(record._id)}
                okText="Sí"
                cancelText="No"
              >
                <Button
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  loading={
                    deleteMutation.isPending &&
                    deleteMutation.variables === record._id
                  }
                />
              </Popconfirm>
            ),
          } as ColumnsType<Campo>[number],
        ]
      : []),
  ];

  return (
    <div>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Campos / Huertas
        </Title>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Nuevo Campo
          </Button>
        )}
      </Space>

      <Table
        rowKey="_id"
        dataSource={camposQuery.data ?? []}
        columns={columns}
        loading={camposQuery.isLoading}
        pagination={{ pageSize: 20 }}
      />

      <CreateCampoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add zarza-web/src/campos/
git commit -m "feat(zarza-web): add Campos module with table, create modal, and delete"
```

---

## Task 15: Solicitudes module

**Files:**
- Create: `zarza-web/src/solicitudes/hooks/useSolicitudes.ts`
- Create: `zarza-web/src/solicitudes/EstadoBadge.tsx`
- Create: `zarza-web/src/solicitudes/UpdateEstadoDropdown.tsx`
- Create: `zarza-web/src/solicitudes/CreateSolicitudModal.tsx`
- Create: `zarza-web/src/solicitudes/SolicitudesPage.tsx`

- [ ] **Step 1: Create src/solicitudes/hooks/useSolicitudes.ts**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../api/client';
import type { Campo } from '../../campos/hooks/useCampos';

export type EstadoSolicitud =
  | 'PENDIENTE'
  | 'EN_PROGRESO'
  | 'COMPLETADO'
  | 'CANCELADO';

export interface Solicitud {
  _id: string;
  campo_id: string;
  asignado_a: string;
  creado_por: string;
  mensaje: string;
  estado: EstadoSolicitud;
  fecha_limite: string | null;
  createdAt: string;
}

export interface MonitorOption {
  id: string;
  email: string;
}

interface SolicitudesFilters {
  page?: number;
  limit?: number;
  estado?: EstadoSolicitud | '';
  campo_id?: string;
}

interface SolicitudesResponse {
  data: Solicitud[];
  total: number;
  page: number;
  limit: number;
}

export function useSolicitudes(filters: SolicitudesFilters = {}) {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.estado) params.set('estado', filters.estado);
  if (filters.campo_id) params.set('campo_id', filters.campo_id);

  return useQuery<SolicitudesResponse>({
    queryKey: ['solicitudes', filters],
    queryFn: () =>
      apiClient
        .get<SolicitudesResponse>(`/solicitudes?${params.toString()}`)
        .then((r) => r.data),
  });
}

export function useCamposOptions() {
  return useQuery<Campo[]>({
    queryKey: ['campos'],
    queryFn: () => apiClient.get<Campo[]>('/campos').then((r) => r.data),
  });
}

export function useMonitores() {
  return useQuery<MonitorOption[]>({
    queryKey: ['admin', 'users', 'MONITOR'],
    queryFn: () =>
      apiClient
        .get<{ data: MonitorOption[] }>('/admin/users?rol=MONITOR&limit=200')
        .then((r) => r.data.data),
  });
}

export function useCreateSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: {
      campo_id: string;
      asignado_a: string;
      mensaje: string;
      fecha_limite?: string;
    }) => apiClient.post<Solicitud>('/solicitudes', dto).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitudes'] }),
  });
}

export function useUpdateEstado() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: EstadoSolicitud }) =>
      apiClient
        .patch<Solicitud>(`/solicitudes/${id}/estado`, { estado })
        .then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['solicitudes'] }),
  });
}
```

- [ ] **Step 2: Create src/solicitudes/EstadoBadge.tsx**

```typescript
import { Tag } from 'antd';
import type { EstadoSolicitud } from './hooks/useSolicitudes';

const COLOR_MAP: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'orange',
  EN_PROGRESO: 'blue',
  COMPLETADO: 'green',
  CANCELADO: 'red',
};

const LABEL_MAP: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En Progreso',
  COMPLETADO: 'Completado',
  CANCELADO: 'Cancelado',
};

export function EstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  return <Tag color={COLOR_MAP[estado]}>{LABEL_MAP[estado]}</Tag>;
}
```

- [ ] **Step 3: Create src/solicitudes/UpdateEstadoDropdown.tsx**

```typescript
import { Select, notification } from 'antd';
import { useUpdateEstado, type EstadoSolicitud } from './hooks/useSolicitudes';

const ESTADO_OPTIONS: { value: EstadoSolicitud; label: string }[] = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_PROGRESO', label: 'En Progreso' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

interface Props {
  solicitudId: string;
  currentEstado: EstadoSolicitud;
}

export function UpdateEstadoDropdown({ solicitudId, currentEstado }: Props) {
  const updateMutation = useUpdateEstado();

  async function handleChange(estado: EstadoSolicitud) {
    try {
      await updateMutation.mutateAsync({ id: solicitudId, estado });
      notification.success({ message: 'Estado actualizado' });
    } catch {
      notification.error({ message: 'Error al actualizar estado' });
    }
  }

  return (
    <Select
      value={currentEstado}
      onChange={handleChange}
      options={ESTADO_OPTIONS}
      loading={updateMutation.isPending}
      style={{ width: 140 }}
      size="small"
    />
  );
}
```

- [ ] **Step 4: Create src/solicitudes/CreateSolicitudModal.tsx**

```typescript
import { Modal, Form, Input, Select, DatePicker, notification } from 'antd';
import dayjs from 'dayjs';
import {
  useCreateSolicitud,
  useCamposOptions,
  useMonitores,
} from './hooks/useSolicitudes';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FormValues {
  campo_id: string;
  asignado_a: string;
  mensaje: string;
  fecha_limite?: ReturnType<typeof dayjs>;
}

export function CreateSolicitudModal({ open, onClose }: Props) {
  const [form] = Form.useForm<FormValues>();
  const createMutation = useCreateSolicitud();
  const camposQuery = useCamposOptions();
  const monitoresQuery = useMonitores();

  async function onFinish(values: FormValues) {
    try {
      await createMutation.mutateAsync({
        campo_id: values.campo_id,
        asignado_a: values.asignado_a,
        mensaje: values.mensaje,
        fecha_limite: values.fecha_limite?.toISOString(),
      });
      notification.success({ message: 'Solicitud creada exitosamente' });
      form.resetFields();
      onClose();
    } catch {
      notification.error({ message: 'Error al crear solicitud' });
    }
  }

  return (
    <Modal
      title="Nueva Solicitud de Muestreo"
      open={open}
      onOk={form.submit}
      onCancel={() => {
        form.resetFields();
        onClose();
      }}
      confirmLoading={createMutation.isPending}
    >
      <Form form={form} layout="vertical" onFinish={onFinish}>
        <Form.Item
          label="Campo"
          name="campo_id"
          rules={[{ required: true, message: 'Selecciona un campo' }]}
        >
          <Select
            loading={camposQuery.isLoading}
            placeholder="Selecciona campo"
            options={(camposQuery.data ?? []).map((c) => ({
              value: c._id,
              label: `${c.codigo_campo} — ${c.nombre}`,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Asignar a (Monitor)"
          name="asignado_a"
          rules={[{ required: true, message: 'Selecciona un monitor' }]}
        >
          <Select
            loading={monitoresQuery.isLoading}
            placeholder="Selecciona monitor"
            options={(monitoresQuery.data ?? []).map((u) => ({
              value: u.id,
              label: u.email,
            }))}
          />
        </Form.Item>

        <Form.Item
          label="Mensaje / Instrucciones"
          name="mensaje"
          rules={[{ required: true, message: 'Ingresa instrucciones' }]}
        >
          <Input.TextArea rows={3} placeholder="Instrucciones para el monitor..." />
        </Form.Item>

        <Form.Item label="Fecha límite (opcional)" name="fecha_limite">
          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
```

- [ ] **Step 5: Create src/solicitudes/SolicitudesPage.tsx**

```typescript
import { useState } from 'react';
import {
  Button,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  useSolicitudes,
  useCamposOptions,
  type Solicitud,
  type EstadoSolicitud,
} from './hooks/useSolicitudes';
import { EstadoBadge } from './EstadoBadge';
import { UpdateEstadoDropdown } from './UpdateEstadoDropdown';
import { CreateSolicitudModal } from './CreateSolicitudModal';
import { useAuth } from '../auth/useAuth';
import { Role } from '../auth/types';

const { Title } = Typography;

const ESTADO_FILTER_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_PROGRESO', label: 'En Progreso' },
  { value: 'COMPLETADO', label: 'Completado' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

export function SolicitudesPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [estado, setEstado] = useState<EstadoSolicitud | ''>('');
  const [campoId, setCampoId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);

  const solicitudesQuery = useSolicitudes({
    page,
    limit: 20,
    estado: estado || undefined,
    campo_id: campoId || undefined,
  });
  const camposQuery = useCamposOptions();

  const canCreate = user?.role === Role.ADMIN;
  const canChangeEstado =
    user?.role === Role.ADMIN ||
    user?.role === Role.AGRONOMO ||
    user?.role === Role.MONITOR;

  const columns: ColumnsType<Solicitud> = [
    { title: 'Campo ID', dataIndex: 'campo_id', key: 'campo_id', ellipsis: true },
    {
      title: 'Asignado a',
      dataIndex: 'asignado_a',
      key: 'asignado_a',
      ellipsis: true,
    },
    { title: 'Mensaje', dataIndex: 'mensaje', key: 'mensaje', ellipsis: true },
    {
      title: 'Fecha límite',
      dataIndex: 'fecha_limite',
      key: 'fecha_limite',
      render: (v: string | null) =>
        v ? new Date(v).toLocaleDateString('es-MX') : '—',
    },
    {
      title: 'Estado',
      dataIndex: 'estado',
      key: 'estado',
      render: (estado: EstadoSolicitud, record) =>
        canChangeEstado ? (
          <UpdateEstadoDropdown
            solicitudId={record._id}
            currentEstado={estado}
          />
        ) : (
          <EstadoBadge estado={estado} />
        ),
    },
    {
      title: 'Creada',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString('es-MX'),
    },
  ];

  return (
    <div>
      <Space
        style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}
      >
        <Title level={4} style={{ margin: 0 }}>
          Solicitudes de Muestreo
        </Title>
        {canCreate && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            Nueva Solicitud
          </Button>
        )}
      </Space>

      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          value={estado}
          onChange={(v) => { setEstado(v); setPage(1); }}
          options={ESTADO_FILTER_OPTIONS}
          style={{ width: 200 }}
          placeholder="Filtrar por estado"
        />
        <Select
          value={campoId}
          onChange={(v) => { setCampoId(v); setPage(1); }}
          loading={camposQuery.isLoading}
          allowClear
          style={{ width: 240 }}
          placeholder="Filtrar por campo"
          options={[
            { value: '', label: 'Todos los campos' },
            ...(camposQuery.data ?? []).map((c) => ({
              value: c._id,
              label: `${c.codigo_campo} — ${c.nombre}`,
            })),
          ]}
        />
      </Space>

      <Table
        rowKey="_id"
        dataSource={solicitudesQuery.data?.data ?? []}
        columns={columns}
        loading={solicitudesQuery.isLoading}
        pagination={{
          current: page,
          pageSize: 20,
          total: solicitudesQuery.data?.total ?? 0,
          onChange: setPage,
        }}
      />

      <CreateSolicitudModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
```

- [ ] **Step 6: Run full TypeScript build to verify no errors**

```bash
cd zarza-web
npm run build
```

Expected: compiles cleanly and `dist/` is produced. Fix any TypeScript errors before committing.

- [ ] **Step 7: Commit**

```bash
git add zarza-web/src/solicitudes/
git commit -m "feat(zarza-web): add Solicitudes module with table, filters, create modal, and estado update"
```

---

## Verification: Manual smoke test

Once all tasks are complete:

- [ ] Start the stack: `docker compose up mongo rabbitmq fruit-backend zarza-web`
- [ ] Open `http://localhost:5173` in the browser
- [ ] Login with an ADMIN account — verify redirect to `/dashboard`
- [ ] Verify Dashboard renders (charts may be empty if no analyses exist, but should not error)
- [ ] Navigate to `/campos` — verify table loads and "Nuevo Campo" button is visible
- [ ] Create a campo and verify it appears in the table
- [ ] Navigate to `/solicitudes` — verify table and filters render
- [ ] Create a solicitud and verify it appears with status PENDIENTE
- [ ] Login as PRODUCTOR — verify only `/dashboard` and `/campos` are visible in sidebar
- [ ] Login as MONITOR — verify only `/solicitudes` is visible, no "Nueva Solicitud" button
- [ ] Reload the page while logged in — verify session persists (cookie hydration via `GET /auth/me`)
- [ ] Click "Salir" — verify redirect to `/login` and cookie is cleared
