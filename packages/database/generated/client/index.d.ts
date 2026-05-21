
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model User
 * 
 */
export type User = $Result.DefaultSelection<Prisma.$UserPayload>
/**
 * Model Campo
 * 
 */
export type Campo = $Result.DefaultSelection<Prisma.$CampoPayload>
/**
 * Model UserCampo
 * 
 */
export type UserCampo = $Result.DefaultSelection<Prisma.$UserCampoPayload>
/**
 * Model SolicitudMuestreo
 * 
 */
export type SolicitudMuestreo = $Result.DefaultSelection<Prisma.$SolicitudMuestreoPayload>
/**
 * Model Analysis
 * 
 */
export type Analysis = $Result.DefaultSelection<Prisma.$AnalysisPayload>
/**
 * Model FenologiaEtapa
 * 
 */
export type FenologiaEtapa = $Result.DefaultSelection<Prisma.$FenologiaEtapaPayload>

/**
 * Enums
 */
export namespace $Enums {
  export const Role: {
  ADMIN: 'ADMIN',
  PRODUCTOR: 'PRODUCTOR',
  AGRONOMO: 'AGRONOMO',
  MONITOR: 'MONITOR'
};

export type Role = (typeof Role)[keyof typeof Role]


export const EstadoSolicitud: {
  PENDIENTE: 'PENDIENTE',
  EN_PROGRESO: 'EN_PROGRESO',
  COMPLETADO: 'COMPLETADO',
  CANCELADO: 'CANCELADO'
};

export type EstadoSolicitud = (typeof EstadoSolicitud)[keyof typeof EstadoSolicitud]


export const EstadoValidacion: {
  pendiente: 'pendiente',
  validado: 'validado',
  rechazado: 'rechazado'
};

export type EstadoValidacion = (typeof EstadoValidacion)[keyof typeof EstadoValidacion]

}

export type Role = $Enums.Role

export const Role: typeof $Enums.Role

export type EstadoSolicitud = $Enums.EstadoSolicitud

export const EstadoSolicitud: typeof $Enums.EstadoSolicitud

export type EstadoValidacion = $Enums.EstadoValidacion

export const EstadoValidacion: typeof $Enums.EstadoValidacion

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more Users
   * const users = await prisma.user.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.user`: Exposes CRUD operations for the **User** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Users
    * const users = await prisma.user.findMany()
    * ```
    */
  get user(): Prisma.UserDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.campo`: Exposes CRUD operations for the **Campo** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Campos
    * const campos = await prisma.campo.findMany()
    * ```
    */
  get campo(): Prisma.CampoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.userCampo`: Exposes CRUD operations for the **UserCampo** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more UserCampos
    * const userCampos = await prisma.userCampo.findMany()
    * ```
    */
  get userCampo(): Prisma.UserCampoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.solicitudMuestreo`: Exposes CRUD operations for the **SolicitudMuestreo** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more SolicitudMuestreos
    * const solicitudMuestreos = await prisma.solicitudMuestreo.findMany()
    * ```
    */
  get solicitudMuestreo(): Prisma.SolicitudMuestreoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.analysis`: Exposes CRUD operations for the **Analysis** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more Analyses
    * const analyses = await prisma.analysis.findMany()
    * ```
    */
  get analysis(): Prisma.AnalysisDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.fenologiaEtapa`: Exposes CRUD operations for the **FenologiaEtapa** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more FenologiaEtapas
    * const fenologiaEtapas = await prisma.fenologiaEtapa.findMany()
    * ```
    */
  get fenologiaEtapa(): Prisma.FenologiaEtapaDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.3
   * Query Engine version: c2990dca591cba766e3b7ef5d9e8a84796e47ab7
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    User: 'User',
    Campo: 'Campo',
    UserCampo: 'UserCampo',
    SolicitudMuestreo: 'SolicitudMuestreo',
    Analysis: 'Analysis',
    FenologiaEtapa: 'FenologiaEtapa'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "user" | "campo" | "userCampo" | "solicitudMuestreo" | "analysis" | "fenologiaEtapa"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      User: {
        payload: Prisma.$UserPayload<ExtArgs>
        fields: Prisma.UserFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findFirst: {
            args: Prisma.UserFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          findMany: {
            args: Prisma.UserFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          create: {
            args: Prisma.UserCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          createMany: {
            args: Prisma.UserCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          delete: {
            args: Prisma.UserDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          update: {
            args: Prisma.UserUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          deleteMany: {
            args: Prisma.UserDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>[]
          }
          upsert: {
            args: Prisma.UserUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserPayload>
          }
          aggregate: {
            args: Prisma.UserAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUser>
          }
          groupBy: {
            args: Prisma.UserGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCountArgs<ExtArgs>
            result: $Utils.Optional<UserCountAggregateOutputType> | number
          }
        }
      }
      Campo: {
        payload: Prisma.$CampoPayload<ExtArgs>
        fields: Prisma.CampoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.CampoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CampoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.CampoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CampoPayload>
          }
          findFirst: {
            args: Prisma.CampoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CampoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.CampoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CampoPayload>
          }
          findMany: {
            args: Prisma.CampoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CampoPayload>[]
          }
          create: {
            args: Prisma.CampoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CampoPayload>
          }
          createMany: {
            args: Prisma.CampoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.CampoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CampoPayload>[]
          }
          delete: {
            args: Prisma.CampoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CampoPayload>
          }
          update: {
            args: Prisma.CampoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CampoPayload>
          }
          deleteMany: {
            args: Prisma.CampoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.CampoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.CampoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CampoPayload>[]
          }
          upsert: {
            args: Prisma.CampoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$CampoPayload>
          }
          aggregate: {
            args: Prisma.CampoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateCampo>
          }
          groupBy: {
            args: Prisma.CampoGroupByArgs<ExtArgs>
            result: $Utils.Optional<CampoGroupByOutputType>[]
          }
          count: {
            args: Prisma.CampoCountArgs<ExtArgs>
            result: $Utils.Optional<CampoCountAggregateOutputType> | number
          }
        }
      }
      UserCampo: {
        payload: Prisma.$UserCampoPayload<ExtArgs>
        fields: Prisma.UserCampoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.UserCampoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserCampoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.UserCampoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserCampoPayload>
          }
          findFirst: {
            args: Prisma.UserCampoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserCampoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.UserCampoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserCampoPayload>
          }
          findMany: {
            args: Prisma.UserCampoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserCampoPayload>[]
          }
          create: {
            args: Prisma.UserCampoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserCampoPayload>
          }
          createMany: {
            args: Prisma.UserCampoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.UserCampoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserCampoPayload>[]
          }
          delete: {
            args: Prisma.UserCampoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserCampoPayload>
          }
          update: {
            args: Prisma.UserCampoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserCampoPayload>
          }
          deleteMany: {
            args: Prisma.UserCampoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.UserCampoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.UserCampoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserCampoPayload>[]
          }
          upsert: {
            args: Prisma.UserCampoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$UserCampoPayload>
          }
          aggregate: {
            args: Prisma.UserCampoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateUserCampo>
          }
          groupBy: {
            args: Prisma.UserCampoGroupByArgs<ExtArgs>
            result: $Utils.Optional<UserCampoGroupByOutputType>[]
          }
          count: {
            args: Prisma.UserCampoCountArgs<ExtArgs>
            result: $Utils.Optional<UserCampoCountAggregateOutputType> | number
          }
        }
      }
      SolicitudMuestreo: {
        payload: Prisma.$SolicitudMuestreoPayload<ExtArgs>
        fields: Prisma.SolicitudMuestreoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.SolicitudMuestreoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SolicitudMuestreoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.SolicitudMuestreoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SolicitudMuestreoPayload>
          }
          findFirst: {
            args: Prisma.SolicitudMuestreoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SolicitudMuestreoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.SolicitudMuestreoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SolicitudMuestreoPayload>
          }
          findMany: {
            args: Prisma.SolicitudMuestreoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SolicitudMuestreoPayload>[]
          }
          create: {
            args: Prisma.SolicitudMuestreoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SolicitudMuestreoPayload>
          }
          createMany: {
            args: Prisma.SolicitudMuestreoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.SolicitudMuestreoCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SolicitudMuestreoPayload>[]
          }
          delete: {
            args: Prisma.SolicitudMuestreoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SolicitudMuestreoPayload>
          }
          update: {
            args: Prisma.SolicitudMuestreoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SolicitudMuestreoPayload>
          }
          deleteMany: {
            args: Prisma.SolicitudMuestreoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.SolicitudMuestreoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.SolicitudMuestreoUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SolicitudMuestreoPayload>[]
          }
          upsert: {
            args: Prisma.SolicitudMuestreoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$SolicitudMuestreoPayload>
          }
          aggregate: {
            args: Prisma.SolicitudMuestreoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateSolicitudMuestreo>
          }
          groupBy: {
            args: Prisma.SolicitudMuestreoGroupByArgs<ExtArgs>
            result: $Utils.Optional<SolicitudMuestreoGroupByOutputType>[]
          }
          count: {
            args: Prisma.SolicitudMuestreoCountArgs<ExtArgs>
            result: $Utils.Optional<SolicitudMuestreoCountAggregateOutputType> | number
          }
        }
      }
      Analysis: {
        payload: Prisma.$AnalysisPayload<ExtArgs>
        fields: Prisma.AnalysisFieldRefs
        operations: {
          findUnique: {
            args: Prisma.AnalysisFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.AnalysisFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisPayload>
          }
          findFirst: {
            args: Prisma.AnalysisFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.AnalysisFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisPayload>
          }
          findMany: {
            args: Prisma.AnalysisFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisPayload>[]
          }
          create: {
            args: Prisma.AnalysisCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisPayload>
          }
          createMany: {
            args: Prisma.AnalysisCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.AnalysisCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisPayload>[]
          }
          delete: {
            args: Prisma.AnalysisDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisPayload>
          }
          update: {
            args: Prisma.AnalysisUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisPayload>
          }
          deleteMany: {
            args: Prisma.AnalysisDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.AnalysisUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.AnalysisUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisPayload>[]
          }
          upsert: {
            args: Prisma.AnalysisUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$AnalysisPayload>
          }
          aggregate: {
            args: Prisma.AnalysisAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateAnalysis>
          }
          groupBy: {
            args: Prisma.AnalysisGroupByArgs<ExtArgs>
            result: $Utils.Optional<AnalysisGroupByOutputType>[]
          }
          count: {
            args: Prisma.AnalysisCountArgs<ExtArgs>
            result: $Utils.Optional<AnalysisCountAggregateOutputType> | number
          }
        }
      }
      FenologiaEtapa: {
        payload: Prisma.$FenologiaEtapaPayload<ExtArgs>
        fields: Prisma.FenologiaEtapaFieldRefs
        operations: {
          findUnique: {
            args: Prisma.FenologiaEtapaFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FenologiaEtapaPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.FenologiaEtapaFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FenologiaEtapaPayload>
          }
          findFirst: {
            args: Prisma.FenologiaEtapaFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FenologiaEtapaPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.FenologiaEtapaFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FenologiaEtapaPayload>
          }
          findMany: {
            args: Prisma.FenologiaEtapaFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FenologiaEtapaPayload>[]
          }
          create: {
            args: Prisma.FenologiaEtapaCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FenologiaEtapaPayload>
          }
          createMany: {
            args: Prisma.FenologiaEtapaCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          createManyAndReturn: {
            args: Prisma.FenologiaEtapaCreateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FenologiaEtapaPayload>[]
          }
          delete: {
            args: Prisma.FenologiaEtapaDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FenologiaEtapaPayload>
          }
          update: {
            args: Prisma.FenologiaEtapaUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FenologiaEtapaPayload>
          }
          deleteMany: {
            args: Prisma.FenologiaEtapaDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.FenologiaEtapaUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateManyAndReturn: {
            args: Prisma.FenologiaEtapaUpdateManyAndReturnArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FenologiaEtapaPayload>[]
          }
          upsert: {
            args: Prisma.FenologiaEtapaUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$FenologiaEtapaPayload>
          }
          aggregate: {
            args: Prisma.FenologiaEtapaAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateFenologiaEtapa>
          }
          groupBy: {
            args: Prisma.FenologiaEtapaGroupByArgs<ExtArgs>
            result: $Utils.Optional<FenologiaEtapaGroupByOutputType>[]
          }
          count: {
            args: Prisma.FenologiaEtapaCountArgs<ExtArgs>
            result: $Utils.Optional<FenologiaEtapaCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    user?: UserOmit
    campo?: CampoOmit
    userCampo?: UserCampoOmit
    solicitudMuestreo?: SolicitudMuestreoOmit
    analysis?: AnalysisOmit
    fenologiaEtapa?: FenologiaEtapaOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */


  /**
   * Count Type UserCountOutputType
   */

  export type UserCountOutputType = {
    camposAsignados: number
    camposProductor: number
    solicitudesCreadas: number
    solicitudesAsignadas: number
    analysesAsRequester: number
    analysesAsProductor: number
    analysesValidadas: number
  }

  export type UserCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    camposAsignados?: boolean | UserCountOutputTypeCountCamposAsignadosArgs
    camposProductor?: boolean | UserCountOutputTypeCountCamposProductorArgs
    solicitudesCreadas?: boolean | UserCountOutputTypeCountSolicitudesCreadasArgs
    solicitudesAsignadas?: boolean | UserCountOutputTypeCountSolicitudesAsignadasArgs
    analysesAsRequester?: boolean | UserCountOutputTypeCountAnalysesAsRequesterArgs
    analysesAsProductor?: boolean | UserCountOutputTypeCountAnalysesAsProductorArgs
    analysesValidadas?: boolean | UserCountOutputTypeCountAnalysesValidadasArgs
  }

  // Custom InputTypes
  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCountOutputType
     */
    select?: UserCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCamposAsignadosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserCampoWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountCamposProductorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CampoWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSolicitudesCreadasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SolicitudMuestreoWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountSolicitudesAsignadasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SolicitudMuestreoWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAnalysesAsRequesterArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AnalysisWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAnalysesAsProductorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AnalysisWhereInput
  }

  /**
   * UserCountOutputType without action
   */
  export type UserCountOutputTypeCountAnalysesValidadasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AnalysisWhereInput
  }


  /**
   * Count Type CampoCountOutputType
   */

  export type CampoCountOutputType = {
    usuarios: number
    solicitudes: number
    analyses: number
  }

  export type CampoCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    usuarios?: boolean | CampoCountOutputTypeCountUsuariosArgs
    solicitudes?: boolean | CampoCountOutputTypeCountSolicitudesArgs
    analyses?: boolean | CampoCountOutputTypeCountAnalysesArgs
  }

  // Custom InputTypes
  /**
   * CampoCountOutputType without action
   */
  export type CampoCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the CampoCountOutputType
     */
    select?: CampoCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * CampoCountOutputType without action
   */
  export type CampoCountOutputTypeCountUsuariosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserCampoWhereInput
  }

  /**
   * CampoCountOutputType without action
   */
  export type CampoCountOutputTypeCountSolicitudesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SolicitudMuestreoWhereInput
  }

  /**
   * CampoCountOutputType without action
   */
  export type CampoCountOutputTypeCountAnalysesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AnalysisWhereInput
  }


  /**
   * Count Type AnalysisCountOutputType
   */

  export type AnalysisCountOutputType = {
    fenologiaEtapas: number
  }

  export type AnalysisCountOutputTypeSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    fenologiaEtapas?: boolean | AnalysisCountOutputTypeCountFenologiaEtapasArgs
  }

  // Custom InputTypes
  /**
   * AnalysisCountOutputType without action
   */
  export type AnalysisCountOutputTypeDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the AnalysisCountOutputType
     */
    select?: AnalysisCountOutputTypeSelect<ExtArgs> | null
  }

  /**
   * AnalysisCountOutputType without action
   */
  export type AnalysisCountOutputTypeCountFenologiaEtapasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FenologiaEtapaWhereInput
  }


  /**
   * Models
   */

  /**
   * Model User
   */

  export type AggregateUser = {
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  export type UserMinAggregateOutputType = {
    id: string | null
    email: string | null
    passwordHash: string | null
    role: $Enums.Role | null
    fcmToken: string | null
    firstName: string | null
    lastName: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserMaxAggregateOutputType = {
    id: string | null
    email: string | null
    passwordHash: string | null
    role: $Enums.Role | null
    fcmToken: string | null
    firstName: string | null
    lastName: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type UserCountAggregateOutputType = {
    id: number
    email: number
    passwordHash: number
    role: number
    fcmToken: number
    firstName: number
    lastName: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type UserMinAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    role?: true
    fcmToken?: true
    firstName?: true
    lastName?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserMaxAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    role?: true
    fcmToken?: true
    firstName?: true
    lastName?: true
    createdAt?: true
    updatedAt?: true
  }

  export type UserCountAggregateInputType = {
    id?: true
    email?: true
    passwordHash?: true
    role?: true
    fcmToken?: true
    firstName?: true
    lastName?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type UserAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which User to aggregate.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Users
    **/
    _count?: true | UserCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserMaxAggregateInputType
  }

  export type GetUserAggregateType<T extends UserAggregateArgs> = {
        [P in keyof T & keyof AggregateUser]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUser[P]>
      : GetScalarType<T[P], AggregateUser[P]>
  }




  export type UserGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserWhereInput
    orderBy?: UserOrderByWithAggregationInput | UserOrderByWithAggregationInput[]
    by: UserScalarFieldEnum[] | UserScalarFieldEnum
    having?: UserScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCountAggregateInputType | true
    _min?: UserMinAggregateInputType
    _max?: UserMaxAggregateInputType
  }

  export type UserGroupByOutputType = {
    id: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken: string | null
    firstName: string | null
    lastName: string | null
    createdAt: Date
    updatedAt: Date
    _count: UserCountAggregateOutputType | null
    _min: UserMinAggregateOutputType | null
    _max: UserMaxAggregateOutputType | null
  }

  type GetUserGroupByPayload<T extends UserGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserGroupByOutputType[P]>
            : GetScalarType<T[P], UserGroupByOutputType[P]>
        }
      >
    >


  export type UserSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    role?: boolean
    fcmToken?: boolean
    firstName?: boolean
    lastName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    camposAsignados?: boolean | User$camposAsignadosArgs<ExtArgs>
    camposProductor?: boolean | User$camposProductorArgs<ExtArgs>
    solicitudesCreadas?: boolean | User$solicitudesCreadasArgs<ExtArgs>
    solicitudesAsignadas?: boolean | User$solicitudesAsignadasArgs<ExtArgs>
    analysesAsRequester?: boolean | User$analysesAsRequesterArgs<ExtArgs>
    analysesAsProductor?: boolean | User$analysesAsProductorArgs<ExtArgs>
    analysesValidadas?: boolean | User$analysesValidadasArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["user"]>

  export type UserSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    role?: boolean
    fcmToken?: boolean
    firstName?: boolean
    lastName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    role?: boolean
    fcmToken?: boolean
    firstName?: boolean
    lastName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }, ExtArgs["result"]["user"]>

  export type UserSelectScalar = {
    id?: boolean
    email?: boolean
    passwordHash?: boolean
    role?: boolean
    fcmToken?: boolean
    firstName?: boolean
    lastName?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type UserOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "email" | "passwordHash" | "role" | "fcmToken" | "firstName" | "lastName" | "createdAt" | "updatedAt", ExtArgs["result"]["user"]>
  export type UserInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    camposAsignados?: boolean | User$camposAsignadosArgs<ExtArgs>
    camposProductor?: boolean | User$camposProductorArgs<ExtArgs>
    solicitudesCreadas?: boolean | User$solicitudesCreadasArgs<ExtArgs>
    solicitudesAsignadas?: boolean | User$solicitudesAsignadasArgs<ExtArgs>
    analysesAsRequester?: boolean | User$analysesAsRequesterArgs<ExtArgs>
    analysesAsProductor?: boolean | User$analysesAsProductorArgs<ExtArgs>
    analysesValidadas?: boolean | User$analysesValidadasArgs<ExtArgs>
    _count?: boolean | UserCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type UserIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}
  export type UserIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {}

  export type $UserPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "User"
    objects: {
      camposAsignados: Prisma.$UserCampoPayload<ExtArgs>[]
      camposProductor: Prisma.$CampoPayload<ExtArgs>[]
      solicitudesCreadas: Prisma.$SolicitudMuestreoPayload<ExtArgs>[]
      solicitudesAsignadas: Prisma.$SolicitudMuestreoPayload<ExtArgs>[]
      analysesAsRequester: Prisma.$AnalysisPayload<ExtArgs>[]
      analysesAsProductor: Prisma.$AnalysisPayload<ExtArgs>[]
      analysesValidadas: Prisma.$AnalysisPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      email: string
      passwordHash: string
      role: $Enums.Role
      fcmToken: string | null
      firstName: string | null
      lastName: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["user"]>
    composites: {}
  }

  type UserGetPayload<S extends boolean | null | undefined | UserDefaultArgs> = $Result.GetResult<Prisma.$UserPayload, S>

  type UserCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCountAggregateInputType | true
    }

  export interface UserDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['User'], meta: { name: 'User' } }
    /**
     * Find zero or one User that matches the filter.
     * @param {UserFindUniqueArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserFindUniqueArgs>(args: SelectSubset<T, UserFindUniqueArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one User that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserFindUniqueOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserFindUniqueOrThrowArgs>(args: SelectSubset<T, UserFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserFindFirstArgs>(args?: SelectSubset<T, UserFindFirstArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first User that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindFirstOrThrowArgs} args - Arguments to find a User
     * @example
     * // Get one User
     * const user = await prisma.user.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserFindFirstOrThrowArgs>(args?: SelectSubset<T, UserFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Users that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Users
     * const users = await prisma.user.findMany()
     * 
     * // Get first 10 Users
     * const users = await prisma.user.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const userWithIdOnly = await prisma.user.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends UserFindManyArgs>(args?: SelectSubset<T, UserFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a User.
     * @param {UserCreateArgs} args - Arguments to create a User.
     * @example
     * // Create one User
     * const User = await prisma.user.create({
     *   data: {
     *     // ... data to create a User
     *   }
     * })
     * 
     */
    create<T extends UserCreateArgs>(args: SelectSubset<T, UserCreateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Users.
     * @param {UserCreateManyArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCreateManyArgs>(args?: SelectSubset<T, UserCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Users and returns the data saved in the database.
     * @param {UserCreateManyAndReturnArgs} args - Arguments to create many Users.
     * @example
     * // Create many Users
     * const user = await prisma.user.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Users and only return the `id`
     * const userWithIdOnly = await prisma.user.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a User.
     * @param {UserDeleteArgs} args - Arguments to delete one User.
     * @example
     * // Delete one User
     * const User = await prisma.user.delete({
     *   where: {
     *     // ... filter to delete one User
     *   }
     * })
     * 
     */
    delete<T extends UserDeleteArgs>(args: SelectSubset<T, UserDeleteArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one User.
     * @param {UserUpdateArgs} args - Arguments to update one User.
     * @example
     * // Update one User
     * const user = await prisma.user.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserUpdateArgs>(args: SelectSubset<T, UserUpdateArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Users.
     * @param {UserDeleteManyArgs} args - Arguments to filter Users to delete.
     * @example
     * // Delete a few Users
     * const { count } = await prisma.user.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserDeleteManyArgs>(args?: SelectSubset<T, UserDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserUpdateManyArgs>(args: SelectSubset<T, UserUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Users and returns the data updated in the database.
     * @param {UserUpdateManyAndReturnArgs} args - Arguments to update many Users.
     * @example
     * // Update many Users
     * const user = await prisma.user.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Users and only return the `id`
     * const userWithIdOnly = await prisma.user.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserUpdateManyAndReturnArgs>(args: SelectSubset<T, UserUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one User.
     * @param {UserUpsertArgs} args - Arguments to update or create a User.
     * @example
     * // Update or create a User
     * const user = await prisma.user.upsert({
     *   create: {
     *     // ... data to create a User
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the User we want to update
     *   }
     * })
     */
    upsert<T extends UserUpsertArgs>(args: SelectSubset<T, UserUpsertArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Users.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCountArgs} args - Arguments to filter Users to count.
     * @example
     * // Count the number of Users
     * const count = await prisma.user.count({
     *   where: {
     *     // ... the filter for the Users we want to count
     *   }
     * })
    **/
    count<T extends UserCountArgs>(
      args?: Subset<T, UserCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserAggregateArgs>(args: Subset<T, UserAggregateArgs>): Prisma.PrismaPromise<GetUserAggregateType<T>>

    /**
     * Group by User.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserGroupByArgs['orderBy'] }
        : { orderBy?: UserGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the User model
   */
  readonly fields: UserFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for User.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    camposAsignados<T extends User$camposAsignadosArgs<ExtArgs> = {}>(args?: Subset<T, User$camposAsignadosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    camposProductor<T extends User$camposProductorArgs<ExtArgs> = {}>(args?: Subset<T, User$camposProductorArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    solicitudesCreadas<T extends User$solicitudesCreadasArgs<ExtArgs> = {}>(args?: Subset<T, User$solicitudesCreadasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    solicitudesAsignadas<T extends User$solicitudesAsignadasArgs<ExtArgs> = {}>(args?: Subset<T, User$solicitudesAsignadasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    analysesAsRequester<T extends User$analysesAsRequesterArgs<ExtArgs> = {}>(args?: Subset<T, User$analysesAsRequesterArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    analysesAsProductor<T extends User$analysesAsProductorArgs<ExtArgs> = {}>(args?: Subset<T, User$analysesAsProductorArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    analysesValidadas<T extends User$analysesValidadasArgs<ExtArgs> = {}>(args?: Subset<T, User$analysesValidadasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the User model
   */
  interface UserFieldRefs {
    readonly id: FieldRef<"User", 'String'>
    readonly email: FieldRef<"User", 'String'>
    readonly passwordHash: FieldRef<"User", 'String'>
    readonly role: FieldRef<"User", 'Role'>
    readonly fcmToken: FieldRef<"User", 'String'>
    readonly firstName: FieldRef<"User", 'String'>
    readonly lastName: FieldRef<"User", 'String'>
    readonly createdAt: FieldRef<"User", 'DateTime'>
    readonly updatedAt: FieldRef<"User", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * User findUnique
   */
  export type UserFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findUniqueOrThrow
   */
  export type UserFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User findFirst
   */
  export type UserFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findFirstOrThrow
   */
  export type UserFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which User to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Users.
     */
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User findMany
   */
  export type UserFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter, which Users to fetch.
     */
    where?: UserWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Users to fetch.
     */
    orderBy?: UserOrderByWithRelationInput | UserOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Users.
     */
    cursor?: UserWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Users from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Users.
     */
    skip?: number
    distinct?: UserScalarFieldEnum | UserScalarFieldEnum[]
  }

  /**
   * User create
   */
  export type UserCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to create a User.
     */
    data: XOR<UserCreateInput, UserUncheckedCreateInput>
  }

  /**
   * User createMany
   */
  export type UserCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User createManyAndReturn
   */
  export type UserCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to create many Users.
     */
    data: UserCreateManyInput | UserCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * User update
   */
  export type UserUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The data needed to update a User.
     */
    data: XOR<UserUpdateInput, UserUncheckedUpdateInput>
    /**
     * Choose, which User to update.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User updateMany
   */
  export type UserUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User updateManyAndReturn
   */
  export type UserUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * The data used to update Users.
     */
    data: XOR<UserUpdateManyMutationInput, UserUncheckedUpdateManyInput>
    /**
     * Filter which Users to update
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to update.
     */
    limit?: number
  }

  /**
   * User upsert
   */
  export type UserUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * The filter to search for the User to update in case it exists.
     */
    where: UserWhereUniqueInput
    /**
     * In case the User found by the `where` argument doesn't exist, create a new User with this data.
     */
    create: XOR<UserCreateInput, UserUncheckedCreateInput>
    /**
     * In case the User was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserUpdateInput, UserUncheckedUpdateInput>
  }

  /**
   * User delete
   */
  export type UserDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    /**
     * Filter which User to delete.
     */
    where: UserWhereUniqueInput
  }

  /**
   * User deleteMany
   */
  export type UserDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Users to delete
     */
    where?: UserWhereInput
    /**
     * Limit how many Users to delete.
     */
    limit?: number
  }

  /**
   * User.camposAsignados
   */
  export type User$camposAsignadosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoInclude<ExtArgs> | null
    where?: UserCampoWhereInput
    orderBy?: UserCampoOrderByWithRelationInput | UserCampoOrderByWithRelationInput[]
    cursor?: UserCampoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserCampoScalarFieldEnum | UserCampoScalarFieldEnum[]
  }

  /**
   * User.camposProductor
   */
  export type User$camposProductorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoInclude<ExtArgs> | null
    where?: CampoWhereInput
    orderBy?: CampoOrderByWithRelationInput | CampoOrderByWithRelationInput[]
    cursor?: CampoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: CampoScalarFieldEnum | CampoScalarFieldEnum[]
  }

  /**
   * User.solicitudesCreadas
   */
  export type User$solicitudesCreadasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
    where?: SolicitudMuestreoWhereInput
    orderBy?: SolicitudMuestreoOrderByWithRelationInput | SolicitudMuestreoOrderByWithRelationInput[]
    cursor?: SolicitudMuestreoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SolicitudMuestreoScalarFieldEnum | SolicitudMuestreoScalarFieldEnum[]
  }

  /**
   * User.solicitudesAsignadas
   */
  export type User$solicitudesAsignadasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
    where?: SolicitudMuestreoWhereInput
    orderBy?: SolicitudMuestreoOrderByWithRelationInput | SolicitudMuestreoOrderByWithRelationInput[]
    cursor?: SolicitudMuestreoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SolicitudMuestreoScalarFieldEnum | SolicitudMuestreoScalarFieldEnum[]
  }

  /**
   * User.analysesAsRequester
   */
  export type User$analysesAsRequesterArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    where?: AnalysisWhereInput
    orderBy?: AnalysisOrderByWithRelationInput | AnalysisOrderByWithRelationInput[]
    cursor?: AnalysisWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AnalysisScalarFieldEnum | AnalysisScalarFieldEnum[]
  }

  /**
   * User.analysesAsProductor
   */
  export type User$analysesAsProductorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    where?: AnalysisWhereInput
    orderBy?: AnalysisOrderByWithRelationInput | AnalysisOrderByWithRelationInput[]
    cursor?: AnalysisWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AnalysisScalarFieldEnum | AnalysisScalarFieldEnum[]
  }

  /**
   * User.analysesValidadas
   */
  export type User$analysesValidadasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    where?: AnalysisWhereInput
    orderBy?: AnalysisOrderByWithRelationInput | AnalysisOrderByWithRelationInput[]
    cursor?: AnalysisWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AnalysisScalarFieldEnum | AnalysisScalarFieldEnum[]
  }

  /**
   * User without action
   */
  export type UserDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
  }


  /**
   * Model Campo
   */

  export type AggregateCampo = {
    _count: CampoCountAggregateOutputType | null
    _min: CampoMinAggregateOutputType | null
    _max: CampoMaxAggregateOutputType | null
  }

  export type CampoMinAggregateOutputType = {
    id: string | null
    codigoCampo: string | null
    nombre: string | null
    productorId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CampoMaxAggregateOutputType = {
    id: string | null
    codigoCampo: string | null
    nombre: string | null
    productorId: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type CampoCountAggregateOutputType = {
    id: number
    codigoCampo: number
    nombre: number
    productorId: number
    poligonoGps: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type CampoMinAggregateInputType = {
    id?: true
    codigoCampo?: true
    nombre?: true
    productorId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CampoMaxAggregateInputType = {
    id?: true
    codigoCampo?: true
    nombre?: true
    productorId?: true
    createdAt?: true
    updatedAt?: true
  }

  export type CampoCountAggregateInputType = {
    id?: true
    codigoCampo?: true
    nombre?: true
    productorId?: true
    poligonoGps?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type CampoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Campo to aggregate.
     */
    where?: CampoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Campos to fetch.
     */
    orderBy?: CampoOrderByWithRelationInput | CampoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: CampoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Campos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Campos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Campos
    **/
    _count?: true | CampoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: CampoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: CampoMaxAggregateInputType
  }

  export type GetCampoAggregateType<T extends CampoAggregateArgs> = {
        [P in keyof T & keyof AggregateCampo]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateCampo[P]>
      : GetScalarType<T[P], AggregateCampo[P]>
  }




  export type CampoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: CampoWhereInput
    orderBy?: CampoOrderByWithAggregationInput | CampoOrderByWithAggregationInput[]
    by: CampoScalarFieldEnum[] | CampoScalarFieldEnum
    having?: CampoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: CampoCountAggregateInputType | true
    _min?: CampoMinAggregateInputType
    _max?: CampoMaxAggregateInputType
  }

  export type CampoGroupByOutputType = {
    id: string
    codigoCampo: string
    nombre: string
    productorId: string
    poligonoGps: JsonValue | null
    createdAt: Date
    updatedAt: Date
    _count: CampoCountAggregateOutputType | null
    _min: CampoMinAggregateOutputType | null
    _max: CampoMaxAggregateOutputType | null
  }

  type GetCampoGroupByPayload<T extends CampoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<CampoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof CampoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], CampoGroupByOutputType[P]>
            : GetScalarType<T[P], CampoGroupByOutputType[P]>
        }
      >
    >


  export type CampoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    codigoCampo?: boolean
    nombre?: boolean
    productorId?: boolean
    poligonoGps?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    productor?: boolean | UserDefaultArgs<ExtArgs>
    usuarios?: boolean | Campo$usuariosArgs<ExtArgs>
    solicitudes?: boolean | Campo$solicitudesArgs<ExtArgs>
    analyses?: boolean | Campo$analysesArgs<ExtArgs>
    _count?: boolean | CampoCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["campo"]>

  export type CampoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    codigoCampo?: boolean
    nombre?: boolean
    productorId?: boolean
    poligonoGps?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    productor?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["campo"]>

  export type CampoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    codigoCampo?: boolean
    nombre?: boolean
    productorId?: boolean
    poligonoGps?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    productor?: boolean | UserDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["campo"]>

  export type CampoSelectScalar = {
    id?: boolean
    codigoCampo?: boolean
    nombre?: boolean
    productorId?: boolean
    poligonoGps?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type CampoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "codigoCampo" | "nombre" | "productorId" | "poligonoGps" | "createdAt" | "updatedAt", ExtArgs["result"]["campo"]>
  export type CampoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    productor?: boolean | UserDefaultArgs<ExtArgs>
    usuarios?: boolean | Campo$usuariosArgs<ExtArgs>
    solicitudes?: boolean | Campo$solicitudesArgs<ExtArgs>
    analyses?: boolean | Campo$analysesArgs<ExtArgs>
    _count?: boolean | CampoCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type CampoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    productor?: boolean | UserDefaultArgs<ExtArgs>
  }
  export type CampoIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    productor?: boolean | UserDefaultArgs<ExtArgs>
  }

  export type $CampoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Campo"
    objects: {
      productor: Prisma.$UserPayload<ExtArgs>
      usuarios: Prisma.$UserCampoPayload<ExtArgs>[]
      solicitudes: Prisma.$SolicitudMuestreoPayload<ExtArgs>[]
      analyses: Prisma.$AnalysisPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      codigoCampo: string
      nombre: string
      productorId: string
      poligonoGps: Prisma.JsonValue | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["campo"]>
    composites: {}
  }

  type CampoGetPayload<S extends boolean | null | undefined | CampoDefaultArgs> = $Result.GetResult<Prisma.$CampoPayload, S>

  type CampoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<CampoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: CampoCountAggregateInputType | true
    }

  export interface CampoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Campo'], meta: { name: 'Campo' } }
    /**
     * Find zero or one Campo that matches the filter.
     * @param {CampoFindUniqueArgs} args - Arguments to find a Campo
     * @example
     * // Get one Campo
     * const campo = await prisma.campo.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends CampoFindUniqueArgs>(args: SelectSubset<T, CampoFindUniqueArgs<ExtArgs>>): Prisma__CampoClient<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Campo that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {CampoFindUniqueOrThrowArgs} args - Arguments to find a Campo
     * @example
     * // Get one Campo
     * const campo = await prisma.campo.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends CampoFindUniqueOrThrowArgs>(args: SelectSubset<T, CampoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__CampoClient<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Campo that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CampoFindFirstArgs} args - Arguments to find a Campo
     * @example
     * // Get one Campo
     * const campo = await prisma.campo.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends CampoFindFirstArgs>(args?: SelectSubset<T, CampoFindFirstArgs<ExtArgs>>): Prisma__CampoClient<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Campo that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CampoFindFirstOrThrowArgs} args - Arguments to find a Campo
     * @example
     * // Get one Campo
     * const campo = await prisma.campo.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends CampoFindFirstOrThrowArgs>(args?: SelectSubset<T, CampoFindFirstOrThrowArgs<ExtArgs>>): Prisma__CampoClient<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Campos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CampoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Campos
     * const campos = await prisma.campo.findMany()
     * 
     * // Get first 10 Campos
     * const campos = await prisma.campo.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const campoWithIdOnly = await prisma.campo.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends CampoFindManyArgs>(args?: SelectSubset<T, CampoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Campo.
     * @param {CampoCreateArgs} args - Arguments to create a Campo.
     * @example
     * // Create one Campo
     * const Campo = await prisma.campo.create({
     *   data: {
     *     // ... data to create a Campo
     *   }
     * })
     * 
     */
    create<T extends CampoCreateArgs>(args: SelectSubset<T, CampoCreateArgs<ExtArgs>>): Prisma__CampoClient<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Campos.
     * @param {CampoCreateManyArgs} args - Arguments to create many Campos.
     * @example
     * // Create many Campos
     * const campo = await prisma.campo.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends CampoCreateManyArgs>(args?: SelectSubset<T, CampoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Campos and returns the data saved in the database.
     * @param {CampoCreateManyAndReturnArgs} args - Arguments to create many Campos.
     * @example
     * // Create many Campos
     * const campo = await prisma.campo.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Campos and only return the `id`
     * const campoWithIdOnly = await prisma.campo.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends CampoCreateManyAndReturnArgs>(args?: SelectSubset<T, CampoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Campo.
     * @param {CampoDeleteArgs} args - Arguments to delete one Campo.
     * @example
     * // Delete one Campo
     * const Campo = await prisma.campo.delete({
     *   where: {
     *     // ... filter to delete one Campo
     *   }
     * })
     * 
     */
    delete<T extends CampoDeleteArgs>(args: SelectSubset<T, CampoDeleteArgs<ExtArgs>>): Prisma__CampoClient<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Campo.
     * @param {CampoUpdateArgs} args - Arguments to update one Campo.
     * @example
     * // Update one Campo
     * const campo = await prisma.campo.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends CampoUpdateArgs>(args: SelectSubset<T, CampoUpdateArgs<ExtArgs>>): Prisma__CampoClient<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Campos.
     * @param {CampoDeleteManyArgs} args - Arguments to filter Campos to delete.
     * @example
     * // Delete a few Campos
     * const { count } = await prisma.campo.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends CampoDeleteManyArgs>(args?: SelectSubset<T, CampoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Campos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CampoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Campos
     * const campo = await prisma.campo.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends CampoUpdateManyArgs>(args: SelectSubset<T, CampoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Campos and returns the data updated in the database.
     * @param {CampoUpdateManyAndReturnArgs} args - Arguments to update many Campos.
     * @example
     * // Update many Campos
     * const campo = await prisma.campo.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Campos and only return the `id`
     * const campoWithIdOnly = await prisma.campo.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends CampoUpdateManyAndReturnArgs>(args: SelectSubset<T, CampoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Campo.
     * @param {CampoUpsertArgs} args - Arguments to update or create a Campo.
     * @example
     * // Update or create a Campo
     * const campo = await prisma.campo.upsert({
     *   create: {
     *     // ... data to create a Campo
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Campo we want to update
     *   }
     * })
     */
    upsert<T extends CampoUpsertArgs>(args: SelectSubset<T, CampoUpsertArgs<ExtArgs>>): Prisma__CampoClient<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Campos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CampoCountArgs} args - Arguments to filter Campos to count.
     * @example
     * // Count the number of Campos
     * const count = await prisma.campo.count({
     *   where: {
     *     // ... the filter for the Campos we want to count
     *   }
     * })
    **/
    count<T extends CampoCountArgs>(
      args?: Subset<T, CampoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], CampoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Campo.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CampoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends CampoAggregateArgs>(args: Subset<T, CampoAggregateArgs>): Prisma.PrismaPromise<GetCampoAggregateType<T>>

    /**
     * Group by Campo.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {CampoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends CampoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: CampoGroupByArgs['orderBy'] }
        : { orderBy?: CampoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, CampoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetCampoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Campo model
   */
  readonly fields: CampoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Campo.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__CampoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    productor<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    usuarios<T extends Campo$usuariosArgs<ExtArgs> = {}>(args?: Subset<T, Campo$usuariosArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    solicitudes<T extends Campo$solicitudesArgs<ExtArgs> = {}>(args?: Subset<T, Campo$solicitudesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    analyses<T extends Campo$analysesArgs<ExtArgs> = {}>(args?: Subset<T, Campo$analysesArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Campo model
   */
  interface CampoFieldRefs {
    readonly id: FieldRef<"Campo", 'String'>
    readonly codigoCampo: FieldRef<"Campo", 'String'>
    readonly nombre: FieldRef<"Campo", 'String'>
    readonly productorId: FieldRef<"Campo", 'String'>
    readonly poligonoGps: FieldRef<"Campo", 'Json'>
    readonly createdAt: FieldRef<"Campo", 'DateTime'>
    readonly updatedAt: FieldRef<"Campo", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Campo findUnique
   */
  export type CampoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoInclude<ExtArgs> | null
    /**
     * Filter, which Campo to fetch.
     */
    where: CampoWhereUniqueInput
  }

  /**
   * Campo findUniqueOrThrow
   */
  export type CampoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoInclude<ExtArgs> | null
    /**
     * Filter, which Campo to fetch.
     */
    where: CampoWhereUniqueInput
  }

  /**
   * Campo findFirst
   */
  export type CampoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoInclude<ExtArgs> | null
    /**
     * Filter, which Campo to fetch.
     */
    where?: CampoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Campos to fetch.
     */
    orderBy?: CampoOrderByWithRelationInput | CampoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Campos.
     */
    cursor?: CampoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Campos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Campos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Campos.
     */
    distinct?: CampoScalarFieldEnum | CampoScalarFieldEnum[]
  }

  /**
   * Campo findFirstOrThrow
   */
  export type CampoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoInclude<ExtArgs> | null
    /**
     * Filter, which Campo to fetch.
     */
    where?: CampoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Campos to fetch.
     */
    orderBy?: CampoOrderByWithRelationInput | CampoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Campos.
     */
    cursor?: CampoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Campos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Campos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Campos.
     */
    distinct?: CampoScalarFieldEnum | CampoScalarFieldEnum[]
  }

  /**
   * Campo findMany
   */
  export type CampoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoInclude<ExtArgs> | null
    /**
     * Filter, which Campos to fetch.
     */
    where?: CampoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Campos to fetch.
     */
    orderBy?: CampoOrderByWithRelationInput | CampoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Campos.
     */
    cursor?: CampoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Campos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Campos.
     */
    skip?: number
    distinct?: CampoScalarFieldEnum | CampoScalarFieldEnum[]
  }

  /**
   * Campo create
   */
  export type CampoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoInclude<ExtArgs> | null
    /**
     * The data needed to create a Campo.
     */
    data: XOR<CampoCreateInput, CampoUncheckedCreateInput>
  }

  /**
   * Campo createMany
   */
  export type CampoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Campos.
     */
    data: CampoCreateManyInput | CampoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Campo createManyAndReturn
   */
  export type CampoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * The data used to create many Campos.
     */
    data: CampoCreateManyInput | CampoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Campo update
   */
  export type CampoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoInclude<ExtArgs> | null
    /**
     * The data needed to update a Campo.
     */
    data: XOR<CampoUpdateInput, CampoUncheckedUpdateInput>
    /**
     * Choose, which Campo to update.
     */
    where: CampoWhereUniqueInput
  }

  /**
   * Campo updateMany
   */
  export type CampoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Campos.
     */
    data: XOR<CampoUpdateManyMutationInput, CampoUncheckedUpdateManyInput>
    /**
     * Filter which Campos to update
     */
    where?: CampoWhereInput
    /**
     * Limit how many Campos to update.
     */
    limit?: number
  }

  /**
   * Campo updateManyAndReturn
   */
  export type CampoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * The data used to update Campos.
     */
    data: XOR<CampoUpdateManyMutationInput, CampoUncheckedUpdateManyInput>
    /**
     * Filter which Campos to update
     */
    where?: CampoWhereInput
    /**
     * Limit how many Campos to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Campo upsert
   */
  export type CampoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoInclude<ExtArgs> | null
    /**
     * The filter to search for the Campo to update in case it exists.
     */
    where: CampoWhereUniqueInput
    /**
     * In case the Campo found by the `where` argument doesn't exist, create a new Campo with this data.
     */
    create: XOR<CampoCreateInput, CampoUncheckedCreateInput>
    /**
     * In case the Campo was found with the provided `where` argument, update it with this data.
     */
    update: XOR<CampoUpdateInput, CampoUncheckedUpdateInput>
  }

  /**
   * Campo delete
   */
  export type CampoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoInclude<ExtArgs> | null
    /**
     * Filter which Campo to delete.
     */
    where: CampoWhereUniqueInput
  }

  /**
   * Campo deleteMany
   */
  export type CampoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Campos to delete
     */
    where?: CampoWhereInput
    /**
     * Limit how many Campos to delete.
     */
    limit?: number
  }

  /**
   * Campo.usuarios
   */
  export type Campo$usuariosArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoInclude<ExtArgs> | null
    where?: UserCampoWhereInput
    orderBy?: UserCampoOrderByWithRelationInput | UserCampoOrderByWithRelationInput[]
    cursor?: UserCampoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: UserCampoScalarFieldEnum | UserCampoScalarFieldEnum[]
  }

  /**
   * Campo.solicitudes
   */
  export type Campo$solicitudesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
    where?: SolicitudMuestreoWhereInput
    orderBy?: SolicitudMuestreoOrderByWithRelationInput | SolicitudMuestreoOrderByWithRelationInput[]
    cursor?: SolicitudMuestreoWhereUniqueInput
    take?: number
    skip?: number
    distinct?: SolicitudMuestreoScalarFieldEnum | SolicitudMuestreoScalarFieldEnum[]
  }

  /**
   * Campo.analyses
   */
  export type Campo$analysesArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    where?: AnalysisWhereInput
    orderBy?: AnalysisOrderByWithRelationInput | AnalysisOrderByWithRelationInput[]
    cursor?: AnalysisWhereUniqueInput
    take?: number
    skip?: number
    distinct?: AnalysisScalarFieldEnum | AnalysisScalarFieldEnum[]
  }

  /**
   * Campo without action
   */
  export type CampoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Campo
     */
    select?: CampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Campo
     */
    omit?: CampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: CampoInclude<ExtArgs> | null
  }


  /**
   * Model UserCampo
   */

  export type AggregateUserCampo = {
    _count: UserCampoCountAggregateOutputType | null
    _min: UserCampoMinAggregateOutputType | null
    _max: UserCampoMaxAggregateOutputType | null
  }

  export type UserCampoMinAggregateOutputType = {
    userId: string | null
    campoId: string | null
  }

  export type UserCampoMaxAggregateOutputType = {
    userId: string | null
    campoId: string | null
  }

  export type UserCampoCountAggregateOutputType = {
    userId: number
    campoId: number
    _all: number
  }


  export type UserCampoMinAggregateInputType = {
    userId?: true
    campoId?: true
  }

  export type UserCampoMaxAggregateInputType = {
    userId?: true
    campoId?: true
  }

  export type UserCampoCountAggregateInputType = {
    userId?: true
    campoId?: true
    _all?: true
  }

  export type UserCampoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserCampo to aggregate.
     */
    where?: UserCampoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserCampos to fetch.
     */
    orderBy?: UserCampoOrderByWithRelationInput | UserCampoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: UserCampoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserCampos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserCampos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned UserCampos
    **/
    _count?: true | UserCampoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: UserCampoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: UserCampoMaxAggregateInputType
  }

  export type GetUserCampoAggregateType<T extends UserCampoAggregateArgs> = {
        [P in keyof T & keyof AggregateUserCampo]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateUserCampo[P]>
      : GetScalarType<T[P], AggregateUserCampo[P]>
  }




  export type UserCampoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: UserCampoWhereInput
    orderBy?: UserCampoOrderByWithAggregationInput | UserCampoOrderByWithAggregationInput[]
    by: UserCampoScalarFieldEnum[] | UserCampoScalarFieldEnum
    having?: UserCampoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: UserCampoCountAggregateInputType | true
    _min?: UserCampoMinAggregateInputType
    _max?: UserCampoMaxAggregateInputType
  }

  export type UserCampoGroupByOutputType = {
    userId: string
    campoId: string
    _count: UserCampoCountAggregateOutputType | null
    _min: UserCampoMinAggregateOutputType | null
    _max: UserCampoMaxAggregateOutputType | null
  }

  type GetUserCampoGroupByPayload<T extends UserCampoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<UserCampoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof UserCampoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], UserCampoGroupByOutputType[P]>
            : GetScalarType<T[P], UserCampoGroupByOutputType[P]>
        }
      >
    >


  export type UserCampoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    campoId?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userCampo"]>

  export type UserCampoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    campoId?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userCampo"]>

  export type UserCampoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    userId?: boolean
    campoId?: boolean
    user?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["userCampo"]>

  export type UserCampoSelectScalar = {
    userId?: boolean
    campoId?: boolean
  }

  export type UserCampoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"userId" | "campoId", ExtArgs["result"]["userCampo"]>
  export type UserCampoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
  }
  export type UserCampoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
  }
  export type UserCampoIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    user?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
  }

  export type $UserCampoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "UserCampo"
    objects: {
      user: Prisma.$UserPayload<ExtArgs>
      campo: Prisma.$CampoPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      userId: string
      campoId: string
    }, ExtArgs["result"]["userCampo"]>
    composites: {}
  }

  type UserCampoGetPayload<S extends boolean | null | undefined | UserCampoDefaultArgs> = $Result.GetResult<Prisma.$UserCampoPayload, S>

  type UserCampoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<UserCampoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: UserCampoCountAggregateInputType | true
    }

  export interface UserCampoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['UserCampo'], meta: { name: 'UserCampo' } }
    /**
     * Find zero or one UserCampo that matches the filter.
     * @param {UserCampoFindUniqueArgs} args - Arguments to find a UserCampo
     * @example
     * // Get one UserCampo
     * const userCampo = await prisma.userCampo.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends UserCampoFindUniqueArgs>(args: SelectSubset<T, UserCampoFindUniqueArgs<ExtArgs>>): Prisma__UserCampoClient<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one UserCampo that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {UserCampoFindUniqueOrThrowArgs} args - Arguments to find a UserCampo
     * @example
     * // Get one UserCampo
     * const userCampo = await prisma.userCampo.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends UserCampoFindUniqueOrThrowArgs>(args: SelectSubset<T, UserCampoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__UserCampoClient<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserCampo that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCampoFindFirstArgs} args - Arguments to find a UserCampo
     * @example
     * // Get one UserCampo
     * const userCampo = await prisma.userCampo.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends UserCampoFindFirstArgs>(args?: SelectSubset<T, UserCampoFindFirstArgs<ExtArgs>>): Prisma__UserCampoClient<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first UserCampo that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCampoFindFirstOrThrowArgs} args - Arguments to find a UserCampo
     * @example
     * // Get one UserCampo
     * const userCampo = await prisma.userCampo.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends UserCampoFindFirstOrThrowArgs>(args?: SelectSubset<T, UserCampoFindFirstOrThrowArgs<ExtArgs>>): Prisma__UserCampoClient<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more UserCampos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCampoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all UserCampos
     * const userCampos = await prisma.userCampo.findMany()
     * 
     * // Get first 10 UserCampos
     * const userCampos = await prisma.userCampo.findMany({ take: 10 })
     * 
     * // Only select the `userId`
     * const userCampoWithUserIdOnly = await prisma.userCampo.findMany({ select: { userId: true } })
     * 
     */
    findMany<T extends UserCampoFindManyArgs>(args?: SelectSubset<T, UserCampoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a UserCampo.
     * @param {UserCampoCreateArgs} args - Arguments to create a UserCampo.
     * @example
     * // Create one UserCampo
     * const UserCampo = await prisma.userCampo.create({
     *   data: {
     *     // ... data to create a UserCampo
     *   }
     * })
     * 
     */
    create<T extends UserCampoCreateArgs>(args: SelectSubset<T, UserCampoCreateArgs<ExtArgs>>): Prisma__UserCampoClient<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many UserCampos.
     * @param {UserCampoCreateManyArgs} args - Arguments to create many UserCampos.
     * @example
     * // Create many UserCampos
     * const userCampo = await prisma.userCampo.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends UserCampoCreateManyArgs>(args?: SelectSubset<T, UserCampoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many UserCampos and returns the data saved in the database.
     * @param {UserCampoCreateManyAndReturnArgs} args - Arguments to create many UserCampos.
     * @example
     * // Create many UserCampos
     * const userCampo = await prisma.userCampo.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many UserCampos and only return the `userId`
     * const userCampoWithUserIdOnly = await prisma.userCampo.createManyAndReturn({
     *   select: { userId: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends UserCampoCreateManyAndReturnArgs>(args?: SelectSubset<T, UserCampoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a UserCampo.
     * @param {UserCampoDeleteArgs} args - Arguments to delete one UserCampo.
     * @example
     * // Delete one UserCampo
     * const UserCampo = await prisma.userCampo.delete({
     *   where: {
     *     // ... filter to delete one UserCampo
     *   }
     * })
     * 
     */
    delete<T extends UserCampoDeleteArgs>(args: SelectSubset<T, UserCampoDeleteArgs<ExtArgs>>): Prisma__UserCampoClient<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one UserCampo.
     * @param {UserCampoUpdateArgs} args - Arguments to update one UserCampo.
     * @example
     * // Update one UserCampo
     * const userCampo = await prisma.userCampo.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends UserCampoUpdateArgs>(args: SelectSubset<T, UserCampoUpdateArgs<ExtArgs>>): Prisma__UserCampoClient<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more UserCampos.
     * @param {UserCampoDeleteManyArgs} args - Arguments to filter UserCampos to delete.
     * @example
     * // Delete a few UserCampos
     * const { count } = await prisma.userCampo.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends UserCampoDeleteManyArgs>(args?: SelectSubset<T, UserCampoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserCampos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCampoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many UserCampos
     * const userCampo = await prisma.userCampo.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends UserCampoUpdateManyArgs>(args: SelectSubset<T, UserCampoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more UserCampos and returns the data updated in the database.
     * @param {UserCampoUpdateManyAndReturnArgs} args - Arguments to update many UserCampos.
     * @example
     * // Update many UserCampos
     * const userCampo = await prisma.userCampo.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more UserCampos and only return the `userId`
     * const userCampoWithUserIdOnly = await prisma.userCampo.updateManyAndReturn({
     *   select: { userId: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends UserCampoUpdateManyAndReturnArgs>(args: SelectSubset<T, UserCampoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one UserCampo.
     * @param {UserCampoUpsertArgs} args - Arguments to update or create a UserCampo.
     * @example
     * // Update or create a UserCampo
     * const userCampo = await prisma.userCampo.upsert({
     *   create: {
     *     // ... data to create a UserCampo
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the UserCampo we want to update
     *   }
     * })
     */
    upsert<T extends UserCampoUpsertArgs>(args: SelectSubset<T, UserCampoUpsertArgs<ExtArgs>>): Prisma__UserCampoClient<$Result.GetResult<Prisma.$UserCampoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of UserCampos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCampoCountArgs} args - Arguments to filter UserCampos to count.
     * @example
     * // Count the number of UserCampos
     * const count = await prisma.userCampo.count({
     *   where: {
     *     // ... the filter for the UserCampos we want to count
     *   }
     * })
    **/
    count<T extends UserCampoCountArgs>(
      args?: Subset<T, UserCampoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], UserCampoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a UserCampo.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCampoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends UserCampoAggregateArgs>(args: Subset<T, UserCampoAggregateArgs>): Prisma.PrismaPromise<GetUserCampoAggregateType<T>>

    /**
     * Group by UserCampo.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {UserCampoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends UserCampoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: UserCampoGroupByArgs['orderBy'] }
        : { orderBy?: UserCampoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, UserCampoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetUserCampoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the UserCampo model
   */
  readonly fields: UserCampoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for UserCampo.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__UserCampoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    user<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    campo<T extends CampoDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CampoDefaultArgs<ExtArgs>>): Prisma__CampoClient<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the UserCampo model
   */
  interface UserCampoFieldRefs {
    readonly userId: FieldRef<"UserCampo", 'String'>
    readonly campoId: FieldRef<"UserCampo", 'String'>
  }
    

  // Custom InputTypes
  /**
   * UserCampo findUnique
   */
  export type UserCampoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoInclude<ExtArgs> | null
    /**
     * Filter, which UserCampo to fetch.
     */
    where: UserCampoWhereUniqueInput
  }

  /**
   * UserCampo findUniqueOrThrow
   */
  export type UserCampoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoInclude<ExtArgs> | null
    /**
     * Filter, which UserCampo to fetch.
     */
    where: UserCampoWhereUniqueInput
  }

  /**
   * UserCampo findFirst
   */
  export type UserCampoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoInclude<ExtArgs> | null
    /**
     * Filter, which UserCampo to fetch.
     */
    where?: UserCampoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserCampos to fetch.
     */
    orderBy?: UserCampoOrderByWithRelationInput | UserCampoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserCampos.
     */
    cursor?: UserCampoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserCampos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserCampos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserCampos.
     */
    distinct?: UserCampoScalarFieldEnum | UserCampoScalarFieldEnum[]
  }

  /**
   * UserCampo findFirstOrThrow
   */
  export type UserCampoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoInclude<ExtArgs> | null
    /**
     * Filter, which UserCampo to fetch.
     */
    where?: UserCampoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserCampos to fetch.
     */
    orderBy?: UserCampoOrderByWithRelationInput | UserCampoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for UserCampos.
     */
    cursor?: UserCampoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserCampos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserCampos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of UserCampos.
     */
    distinct?: UserCampoScalarFieldEnum | UserCampoScalarFieldEnum[]
  }

  /**
   * UserCampo findMany
   */
  export type UserCampoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoInclude<ExtArgs> | null
    /**
     * Filter, which UserCampos to fetch.
     */
    where?: UserCampoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of UserCampos to fetch.
     */
    orderBy?: UserCampoOrderByWithRelationInput | UserCampoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing UserCampos.
     */
    cursor?: UserCampoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` UserCampos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` UserCampos.
     */
    skip?: number
    distinct?: UserCampoScalarFieldEnum | UserCampoScalarFieldEnum[]
  }

  /**
   * UserCampo create
   */
  export type UserCampoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoInclude<ExtArgs> | null
    /**
     * The data needed to create a UserCampo.
     */
    data: XOR<UserCampoCreateInput, UserCampoUncheckedCreateInput>
  }

  /**
   * UserCampo createMany
   */
  export type UserCampoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many UserCampos.
     */
    data: UserCampoCreateManyInput | UserCampoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * UserCampo createManyAndReturn
   */
  export type UserCampoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * The data used to create many UserCampos.
     */
    data: UserCampoCreateManyInput | UserCampoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserCampo update
   */
  export type UserCampoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoInclude<ExtArgs> | null
    /**
     * The data needed to update a UserCampo.
     */
    data: XOR<UserCampoUpdateInput, UserCampoUncheckedUpdateInput>
    /**
     * Choose, which UserCampo to update.
     */
    where: UserCampoWhereUniqueInput
  }

  /**
   * UserCampo updateMany
   */
  export type UserCampoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update UserCampos.
     */
    data: XOR<UserCampoUpdateManyMutationInput, UserCampoUncheckedUpdateManyInput>
    /**
     * Filter which UserCampos to update
     */
    where?: UserCampoWhereInput
    /**
     * Limit how many UserCampos to update.
     */
    limit?: number
  }

  /**
   * UserCampo updateManyAndReturn
   */
  export type UserCampoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * The data used to update UserCampos.
     */
    data: XOR<UserCampoUpdateManyMutationInput, UserCampoUncheckedUpdateManyInput>
    /**
     * Filter which UserCampos to update
     */
    where?: UserCampoWhereInput
    /**
     * Limit how many UserCampos to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * UserCampo upsert
   */
  export type UserCampoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoInclude<ExtArgs> | null
    /**
     * The filter to search for the UserCampo to update in case it exists.
     */
    where: UserCampoWhereUniqueInput
    /**
     * In case the UserCampo found by the `where` argument doesn't exist, create a new UserCampo with this data.
     */
    create: XOR<UserCampoCreateInput, UserCampoUncheckedCreateInput>
    /**
     * In case the UserCampo was found with the provided `where` argument, update it with this data.
     */
    update: XOR<UserCampoUpdateInput, UserCampoUncheckedUpdateInput>
  }

  /**
   * UserCampo delete
   */
  export type UserCampoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoInclude<ExtArgs> | null
    /**
     * Filter which UserCampo to delete.
     */
    where: UserCampoWhereUniqueInput
  }

  /**
   * UserCampo deleteMany
   */
  export type UserCampoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which UserCampos to delete
     */
    where?: UserCampoWhereInput
    /**
     * Limit how many UserCampos to delete.
     */
    limit?: number
  }

  /**
   * UserCampo without action
   */
  export type UserCampoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the UserCampo
     */
    select?: UserCampoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the UserCampo
     */
    omit?: UserCampoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserCampoInclude<ExtArgs> | null
  }


  /**
   * Model SolicitudMuestreo
   */

  export type AggregateSolicitudMuestreo = {
    _count: SolicitudMuestreoCountAggregateOutputType | null
    _min: SolicitudMuestreoMinAggregateOutputType | null
    _max: SolicitudMuestreoMaxAggregateOutputType | null
  }

  export type SolicitudMuestreoMinAggregateOutputType = {
    id: string | null
    creadoPorId: string | null
    asignadoAId: string | null
    campoId: string | null
    mensaje: string | null
    estado: $Enums.EstadoSolicitud | null
    fechaLimite: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SolicitudMuestreoMaxAggregateOutputType = {
    id: string | null
    creadoPorId: string | null
    asignadoAId: string | null
    campoId: string | null
    mensaje: string | null
    estado: $Enums.EstadoSolicitud | null
    fechaLimite: Date | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type SolicitudMuestreoCountAggregateOutputType = {
    id: number
    creadoPorId: number
    asignadoAId: number
    campoId: number
    mensaje: number
    estado: number
    fechaLimite: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type SolicitudMuestreoMinAggregateInputType = {
    id?: true
    creadoPorId?: true
    asignadoAId?: true
    campoId?: true
    mensaje?: true
    estado?: true
    fechaLimite?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SolicitudMuestreoMaxAggregateInputType = {
    id?: true
    creadoPorId?: true
    asignadoAId?: true
    campoId?: true
    mensaje?: true
    estado?: true
    fechaLimite?: true
    createdAt?: true
    updatedAt?: true
  }

  export type SolicitudMuestreoCountAggregateInputType = {
    id?: true
    creadoPorId?: true
    asignadoAId?: true
    campoId?: true
    mensaje?: true
    estado?: true
    fechaLimite?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type SolicitudMuestreoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SolicitudMuestreo to aggregate.
     */
    where?: SolicitudMuestreoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SolicitudMuestreos to fetch.
     */
    orderBy?: SolicitudMuestreoOrderByWithRelationInput | SolicitudMuestreoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: SolicitudMuestreoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SolicitudMuestreos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SolicitudMuestreos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned SolicitudMuestreos
    **/
    _count?: true | SolicitudMuestreoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: SolicitudMuestreoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: SolicitudMuestreoMaxAggregateInputType
  }

  export type GetSolicitudMuestreoAggregateType<T extends SolicitudMuestreoAggregateArgs> = {
        [P in keyof T & keyof AggregateSolicitudMuestreo]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateSolicitudMuestreo[P]>
      : GetScalarType<T[P], AggregateSolicitudMuestreo[P]>
  }




  export type SolicitudMuestreoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: SolicitudMuestreoWhereInput
    orderBy?: SolicitudMuestreoOrderByWithAggregationInput | SolicitudMuestreoOrderByWithAggregationInput[]
    by: SolicitudMuestreoScalarFieldEnum[] | SolicitudMuestreoScalarFieldEnum
    having?: SolicitudMuestreoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: SolicitudMuestreoCountAggregateInputType | true
    _min?: SolicitudMuestreoMinAggregateInputType
    _max?: SolicitudMuestreoMaxAggregateInputType
  }

  export type SolicitudMuestreoGroupByOutputType = {
    id: string
    creadoPorId: string
    asignadoAId: string
    campoId: string
    mensaje: string
    estado: $Enums.EstadoSolicitud
    fechaLimite: Date | null
    createdAt: Date
    updatedAt: Date
    _count: SolicitudMuestreoCountAggregateOutputType | null
    _min: SolicitudMuestreoMinAggregateOutputType | null
    _max: SolicitudMuestreoMaxAggregateOutputType | null
  }

  type GetSolicitudMuestreoGroupByPayload<T extends SolicitudMuestreoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<SolicitudMuestreoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof SolicitudMuestreoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], SolicitudMuestreoGroupByOutputType[P]>
            : GetScalarType<T[P], SolicitudMuestreoGroupByOutputType[P]>
        }
      >
    >


  export type SolicitudMuestreoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    creadoPorId?: boolean
    asignadoAId?: boolean
    campoId?: boolean
    mensaje?: boolean
    estado?: boolean
    fechaLimite?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    creadoPor?: boolean | UserDefaultArgs<ExtArgs>
    asignadoA?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["solicitudMuestreo"]>

  export type SolicitudMuestreoSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    creadoPorId?: boolean
    asignadoAId?: boolean
    campoId?: boolean
    mensaje?: boolean
    estado?: boolean
    fechaLimite?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    creadoPor?: boolean | UserDefaultArgs<ExtArgs>
    asignadoA?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["solicitudMuestreo"]>

  export type SolicitudMuestreoSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    creadoPorId?: boolean
    asignadoAId?: boolean
    campoId?: boolean
    mensaje?: boolean
    estado?: boolean
    fechaLimite?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    creadoPor?: boolean | UserDefaultArgs<ExtArgs>
    asignadoA?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["solicitudMuestreo"]>

  export type SolicitudMuestreoSelectScalar = {
    id?: boolean
    creadoPorId?: boolean
    asignadoAId?: boolean
    campoId?: boolean
    mensaje?: boolean
    estado?: boolean
    fechaLimite?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type SolicitudMuestreoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "creadoPorId" | "asignadoAId" | "campoId" | "mensaje" | "estado" | "fechaLimite" | "createdAt" | "updatedAt", ExtArgs["result"]["solicitudMuestreo"]>
  export type SolicitudMuestreoInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    creadoPor?: boolean | UserDefaultArgs<ExtArgs>
    asignadoA?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
  }
  export type SolicitudMuestreoIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    creadoPor?: boolean | UserDefaultArgs<ExtArgs>
    asignadoA?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
  }
  export type SolicitudMuestreoIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    creadoPor?: boolean | UserDefaultArgs<ExtArgs>
    asignadoA?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
  }

  export type $SolicitudMuestreoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "SolicitudMuestreo"
    objects: {
      creadoPor: Prisma.$UserPayload<ExtArgs>
      asignadoA: Prisma.$UserPayload<ExtArgs>
      campo: Prisma.$CampoPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      creadoPorId: string
      asignadoAId: string
      campoId: string
      mensaje: string
      estado: $Enums.EstadoSolicitud
      fechaLimite: Date | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["solicitudMuestreo"]>
    composites: {}
  }

  type SolicitudMuestreoGetPayload<S extends boolean | null | undefined | SolicitudMuestreoDefaultArgs> = $Result.GetResult<Prisma.$SolicitudMuestreoPayload, S>

  type SolicitudMuestreoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<SolicitudMuestreoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: SolicitudMuestreoCountAggregateInputType | true
    }

  export interface SolicitudMuestreoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['SolicitudMuestreo'], meta: { name: 'SolicitudMuestreo' } }
    /**
     * Find zero or one SolicitudMuestreo that matches the filter.
     * @param {SolicitudMuestreoFindUniqueArgs} args - Arguments to find a SolicitudMuestreo
     * @example
     * // Get one SolicitudMuestreo
     * const solicitudMuestreo = await prisma.solicitudMuestreo.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends SolicitudMuestreoFindUniqueArgs>(args: SelectSubset<T, SolicitudMuestreoFindUniqueArgs<ExtArgs>>): Prisma__SolicitudMuestreoClient<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one SolicitudMuestreo that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {SolicitudMuestreoFindUniqueOrThrowArgs} args - Arguments to find a SolicitudMuestreo
     * @example
     * // Get one SolicitudMuestreo
     * const solicitudMuestreo = await prisma.solicitudMuestreo.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends SolicitudMuestreoFindUniqueOrThrowArgs>(args: SelectSubset<T, SolicitudMuestreoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__SolicitudMuestreoClient<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SolicitudMuestreo that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SolicitudMuestreoFindFirstArgs} args - Arguments to find a SolicitudMuestreo
     * @example
     * // Get one SolicitudMuestreo
     * const solicitudMuestreo = await prisma.solicitudMuestreo.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends SolicitudMuestreoFindFirstArgs>(args?: SelectSubset<T, SolicitudMuestreoFindFirstArgs<ExtArgs>>): Prisma__SolicitudMuestreoClient<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first SolicitudMuestreo that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SolicitudMuestreoFindFirstOrThrowArgs} args - Arguments to find a SolicitudMuestreo
     * @example
     * // Get one SolicitudMuestreo
     * const solicitudMuestreo = await prisma.solicitudMuestreo.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends SolicitudMuestreoFindFirstOrThrowArgs>(args?: SelectSubset<T, SolicitudMuestreoFindFirstOrThrowArgs<ExtArgs>>): Prisma__SolicitudMuestreoClient<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more SolicitudMuestreos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SolicitudMuestreoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all SolicitudMuestreos
     * const solicitudMuestreos = await prisma.solicitudMuestreo.findMany()
     * 
     * // Get first 10 SolicitudMuestreos
     * const solicitudMuestreos = await prisma.solicitudMuestreo.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const solicitudMuestreoWithIdOnly = await prisma.solicitudMuestreo.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends SolicitudMuestreoFindManyArgs>(args?: SelectSubset<T, SolicitudMuestreoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a SolicitudMuestreo.
     * @param {SolicitudMuestreoCreateArgs} args - Arguments to create a SolicitudMuestreo.
     * @example
     * // Create one SolicitudMuestreo
     * const SolicitudMuestreo = await prisma.solicitudMuestreo.create({
     *   data: {
     *     // ... data to create a SolicitudMuestreo
     *   }
     * })
     * 
     */
    create<T extends SolicitudMuestreoCreateArgs>(args: SelectSubset<T, SolicitudMuestreoCreateArgs<ExtArgs>>): Prisma__SolicitudMuestreoClient<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many SolicitudMuestreos.
     * @param {SolicitudMuestreoCreateManyArgs} args - Arguments to create many SolicitudMuestreos.
     * @example
     * // Create many SolicitudMuestreos
     * const solicitudMuestreo = await prisma.solicitudMuestreo.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends SolicitudMuestreoCreateManyArgs>(args?: SelectSubset<T, SolicitudMuestreoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many SolicitudMuestreos and returns the data saved in the database.
     * @param {SolicitudMuestreoCreateManyAndReturnArgs} args - Arguments to create many SolicitudMuestreos.
     * @example
     * // Create many SolicitudMuestreos
     * const solicitudMuestreo = await prisma.solicitudMuestreo.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many SolicitudMuestreos and only return the `id`
     * const solicitudMuestreoWithIdOnly = await prisma.solicitudMuestreo.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends SolicitudMuestreoCreateManyAndReturnArgs>(args?: SelectSubset<T, SolicitudMuestreoCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a SolicitudMuestreo.
     * @param {SolicitudMuestreoDeleteArgs} args - Arguments to delete one SolicitudMuestreo.
     * @example
     * // Delete one SolicitudMuestreo
     * const SolicitudMuestreo = await prisma.solicitudMuestreo.delete({
     *   where: {
     *     // ... filter to delete one SolicitudMuestreo
     *   }
     * })
     * 
     */
    delete<T extends SolicitudMuestreoDeleteArgs>(args: SelectSubset<T, SolicitudMuestreoDeleteArgs<ExtArgs>>): Prisma__SolicitudMuestreoClient<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one SolicitudMuestreo.
     * @param {SolicitudMuestreoUpdateArgs} args - Arguments to update one SolicitudMuestreo.
     * @example
     * // Update one SolicitudMuestreo
     * const solicitudMuestreo = await prisma.solicitudMuestreo.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends SolicitudMuestreoUpdateArgs>(args: SelectSubset<T, SolicitudMuestreoUpdateArgs<ExtArgs>>): Prisma__SolicitudMuestreoClient<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more SolicitudMuestreos.
     * @param {SolicitudMuestreoDeleteManyArgs} args - Arguments to filter SolicitudMuestreos to delete.
     * @example
     * // Delete a few SolicitudMuestreos
     * const { count } = await prisma.solicitudMuestreo.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends SolicitudMuestreoDeleteManyArgs>(args?: SelectSubset<T, SolicitudMuestreoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SolicitudMuestreos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SolicitudMuestreoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many SolicitudMuestreos
     * const solicitudMuestreo = await prisma.solicitudMuestreo.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends SolicitudMuestreoUpdateManyArgs>(args: SelectSubset<T, SolicitudMuestreoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more SolicitudMuestreos and returns the data updated in the database.
     * @param {SolicitudMuestreoUpdateManyAndReturnArgs} args - Arguments to update many SolicitudMuestreos.
     * @example
     * // Update many SolicitudMuestreos
     * const solicitudMuestreo = await prisma.solicitudMuestreo.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more SolicitudMuestreos and only return the `id`
     * const solicitudMuestreoWithIdOnly = await prisma.solicitudMuestreo.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends SolicitudMuestreoUpdateManyAndReturnArgs>(args: SelectSubset<T, SolicitudMuestreoUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one SolicitudMuestreo.
     * @param {SolicitudMuestreoUpsertArgs} args - Arguments to update or create a SolicitudMuestreo.
     * @example
     * // Update or create a SolicitudMuestreo
     * const solicitudMuestreo = await prisma.solicitudMuestreo.upsert({
     *   create: {
     *     // ... data to create a SolicitudMuestreo
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the SolicitudMuestreo we want to update
     *   }
     * })
     */
    upsert<T extends SolicitudMuestreoUpsertArgs>(args: SelectSubset<T, SolicitudMuestreoUpsertArgs<ExtArgs>>): Prisma__SolicitudMuestreoClient<$Result.GetResult<Prisma.$SolicitudMuestreoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of SolicitudMuestreos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SolicitudMuestreoCountArgs} args - Arguments to filter SolicitudMuestreos to count.
     * @example
     * // Count the number of SolicitudMuestreos
     * const count = await prisma.solicitudMuestreo.count({
     *   where: {
     *     // ... the filter for the SolicitudMuestreos we want to count
     *   }
     * })
    **/
    count<T extends SolicitudMuestreoCountArgs>(
      args?: Subset<T, SolicitudMuestreoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], SolicitudMuestreoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a SolicitudMuestreo.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SolicitudMuestreoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends SolicitudMuestreoAggregateArgs>(args: Subset<T, SolicitudMuestreoAggregateArgs>): Prisma.PrismaPromise<GetSolicitudMuestreoAggregateType<T>>

    /**
     * Group by SolicitudMuestreo.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {SolicitudMuestreoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends SolicitudMuestreoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: SolicitudMuestreoGroupByArgs['orderBy'] }
        : { orderBy?: SolicitudMuestreoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, SolicitudMuestreoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetSolicitudMuestreoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the SolicitudMuestreo model
   */
  readonly fields: SolicitudMuestreoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for SolicitudMuestreo.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__SolicitudMuestreoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    creadoPor<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    asignadoA<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    campo<T extends CampoDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CampoDefaultArgs<ExtArgs>>): Prisma__CampoClient<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the SolicitudMuestreo model
   */
  interface SolicitudMuestreoFieldRefs {
    readonly id: FieldRef<"SolicitudMuestreo", 'String'>
    readonly creadoPorId: FieldRef<"SolicitudMuestreo", 'String'>
    readonly asignadoAId: FieldRef<"SolicitudMuestreo", 'String'>
    readonly campoId: FieldRef<"SolicitudMuestreo", 'String'>
    readonly mensaje: FieldRef<"SolicitudMuestreo", 'String'>
    readonly estado: FieldRef<"SolicitudMuestreo", 'EstadoSolicitud'>
    readonly fechaLimite: FieldRef<"SolicitudMuestreo", 'DateTime'>
    readonly createdAt: FieldRef<"SolicitudMuestreo", 'DateTime'>
    readonly updatedAt: FieldRef<"SolicitudMuestreo", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * SolicitudMuestreo findUnique
   */
  export type SolicitudMuestreoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
    /**
     * Filter, which SolicitudMuestreo to fetch.
     */
    where: SolicitudMuestreoWhereUniqueInput
  }

  /**
   * SolicitudMuestreo findUniqueOrThrow
   */
  export type SolicitudMuestreoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
    /**
     * Filter, which SolicitudMuestreo to fetch.
     */
    where: SolicitudMuestreoWhereUniqueInput
  }

  /**
   * SolicitudMuestreo findFirst
   */
  export type SolicitudMuestreoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
    /**
     * Filter, which SolicitudMuestreo to fetch.
     */
    where?: SolicitudMuestreoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SolicitudMuestreos to fetch.
     */
    orderBy?: SolicitudMuestreoOrderByWithRelationInput | SolicitudMuestreoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SolicitudMuestreos.
     */
    cursor?: SolicitudMuestreoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SolicitudMuestreos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SolicitudMuestreos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SolicitudMuestreos.
     */
    distinct?: SolicitudMuestreoScalarFieldEnum | SolicitudMuestreoScalarFieldEnum[]
  }

  /**
   * SolicitudMuestreo findFirstOrThrow
   */
  export type SolicitudMuestreoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
    /**
     * Filter, which SolicitudMuestreo to fetch.
     */
    where?: SolicitudMuestreoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SolicitudMuestreos to fetch.
     */
    orderBy?: SolicitudMuestreoOrderByWithRelationInput | SolicitudMuestreoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for SolicitudMuestreos.
     */
    cursor?: SolicitudMuestreoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SolicitudMuestreos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SolicitudMuestreos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of SolicitudMuestreos.
     */
    distinct?: SolicitudMuestreoScalarFieldEnum | SolicitudMuestreoScalarFieldEnum[]
  }

  /**
   * SolicitudMuestreo findMany
   */
  export type SolicitudMuestreoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
    /**
     * Filter, which SolicitudMuestreos to fetch.
     */
    where?: SolicitudMuestreoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of SolicitudMuestreos to fetch.
     */
    orderBy?: SolicitudMuestreoOrderByWithRelationInput | SolicitudMuestreoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing SolicitudMuestreos.
     */
    cursor?: SolicitudMuestreoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` SolicitudMuestreos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` SolicitudMuestreos.
     */
    skip?: number
    distinct?: SolicitudMuestreoScalarFieldEnum | SolicitudMuestreoScalarFieldEnum[]
  }

  /**
   * SolicitudMuestreo create
   */
  export type SolicitudMuestreoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
    /**
     * The data needed to create a SolicitudMuestreo.
     */
    data: XOR<SolicitudMuestreoCreateInput, SolicitudMuestreoUncheckedCreateInput>
  }

  /**
   * SolicitudMuestreo createMany
   */
  export type SolicitudMuestreoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many SolicitudMuestreos.
     */
    data: SolicitudMuestreoCreateManyInput | SolicitudMuestreoCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * SolicitudMuestreo createManyAndReturn
   */
  export type SolicitudMuestreoCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * The data used to create many SolicitudMuestreos.
     */
    data: SolicitudMuestreoCreateManyInput | SolicitudMuestreoCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * SolicitudMuestreo update
   */
  export type SolicitudMuestreoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
    /**
     * The data needed to update a SolicitudMuestreo.
     */
    data: XOR<SolicitudMuestreoUpdateInput, SolicitudMuestreoUncheckedUpdateInput>
    /**
     * Choose, which SolicitudMuestreo to update.
     */
    where: SolicitudMuestreoWhereUniqueInput
  }

  /**
   * SolicitudMuestreo updateMany
   */
  export type SolicitudMuestreoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update SolicitudMuestreos.
     */
    data: XOR<SolicitudMuestreoUpdateManyMutationInput, SolicitudMuestreoUncheckedUpdateManyInput>
    /**
     * Filter which SolicitudMuestreos to update
     */
    where?: SolicitudMuestreoWhereInput
    /**
     * Limit how many SolicitudMuestreos to update.
     */
    limit?: number
  }

  /**
   * SolicitudMuestreo updateManyAndReturn
   */
  export type SolicitudMuestreoUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * The data used to update SolicitudMuestreos.
     */
    data: XOR<SolicitudMuestreoUpdateManyMutationInput, SolicitudMuestreoUncheckedUpdateManyInput>
    /**
     * Filter which SolicitudMuestreos to update
     */
    where?: SolicitudMuestreoWhereInput
    /**
     * Limit how many SolicitudMuestreos to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * SolicitudMuestreo upsert
   */
  export type SolicitudMuestreoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
    /**
     * The filter to search for the SolicitudMuestreo to update in case it exists.
     */
    where: SolicitudMuestreoWhereUniqueInput
    /**
     * In case the SolicitudMuestreo found by the `where` argument doesn't exist, create a new SolicitudMuestreo with this data.
     */
    create: XOR<SolicitudMuestreoCreateInput, SolicitudMuestreoUncheckedCreateInput>
    /**
     * In case the SolicitudMuestreo was found with the provided `where` argument, update it with this data.
     */
    update: XOR<SolicitudMuestreoUpdateInput, SolicitudMuestreoUncheckedUpdateInput>
  }

  /**
   * SolicitudMuestreo delete
   */
  export type SolicitudMuestreoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
    /**
     * Filter which SolicitudMuestreo to delete.
     */
    where: SolicitudMuestreoWhereUniqueInput
  }

  /**
   * SolicitudMuestreo deleteMany
   */
  export type SolicitudMuestreoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which SolicitudMuestreos to delete
     */
    where?: SolicitudMuestreoWhereInput
    /**
     * Limit how many SolicitudMuestreos to delete.
     */
    limit?: number
  }

  /**
   * SolicitudMuestreo without action
   */
  export type SolicitudMuestreoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the SolicitudMuestreo
     */
    select?: SolicitudMuestreoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the SolicitudMuestreo
     */
    omit?: SolicitudMuestreoOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: SolicitudMuestreoInclude<ExtArgs> | null
  }


  /**
   * Model Analysis
   */

  export type AggregateAnalysis = {
    _count: AnalysisCountAggregateOutputType | null
    _avg: AnalysisAvgAggregateOutputType | null
    _sum: AnalysisSumAggregateOutputType | null
    _min: AnalysisMinAggregateOutputType | null
    _max: AnalysisMaxAggregateOutputType | null
  }

  export type AnalysisAvgAggregateOutputType = {
    totalElementosDetectados: number | null
    elementosSanos: number | null
    elementosEnfermos: number | null
    porcentajeMermaGeneral: number | null
    pesoSanoGramos: number | null
    ubicacionLat: number | null
    ubicacionLng: number | null
  }

  export type AnalysisSumAggregateOutputType = {
    totalElementosDetectados: number | null
    elementosSanos: number | null
    elementosEnfermos: number | null
    porcentajeMermaGeneral: number | null
    pesoSanoGramos: number | null
    ubicacionLat: number | null
    ubicacionLng: number | null
  }

  export type AnalysisMinAggregateOutputType = {
    id: string | null
    imageId: string | null
    storageKey: string | null
    requesterUserId: string | null
    requesterEmail: string | null
    variedad: string | null
    fechaAnalisis: Date | null
    totalElementosDetectados: number | null
    elementosSanos: number | null
    elementosEnfermos: number | null
    porcentajeMermaGeneral: number | null
    pesoSanoGramos: number | null
    ubicacionLat: number | null
    ubicacionLng: number | null
    campoId: string | null
    productorId: string | null
    offlineSyncId: string | null
    validacionEstado: $Enums.EstadoValidacion | null
    validacionFueCorregido: boolean | null
    validacionCorregidoPorId: string | null
    validacionDiagnosticoOriginal: string | null
    validacionObservaciones: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AnalysisMaxAggregateOutputType = {
    id: string | null
    imageId: string | null
    storageKey: string | null
    requesterUserId: string | null
    requesterEmail: string | null
    variedad: string | null
    fechaAnalisis: Date | null
    totalElementosDetectados: number | null
    elementosSanos: number | null
    elementosEnfermos: number | null
    porcentajeMermaGeneral: number | null
    pesoSanoGramos: number | null
    ubicacionLat: number | null
    ubicacionLng: number | null
    campoId: string | null
    productorId: string | null
    offlineSyncId: string | null
    validacionEstado: $Enums.EstadoValidacion | null
    validacionFueCorregido: boolean | null
    validacionCorregidoPorId: string | null
    validacionDiagnosticoOriginal: string | null
    validacionObservaciones: string | null
    createdAt: Date | null
    updatedAt: Date | null
  }

  export type AnalysisCountAggregateOutputType = {
    id: number
    imageId: number
    storageKey: number
    requesterUserId: number
    requesterEmail: number
    variedad: number
    fechaAnalisis: number
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat: number
    ubicacionLng: number
    campoId: number
    productorId: number
    offlineSyncId: number
    validacionEstado: number
    validacionFueCorregido: number
    validacionCorregidoPorId: number
    validacionDiagnosticoOriginal: number
    validacionCronogramaCorregido: number
    validacionObservaciones: number
    createdAt: number
    updatedAt: number
    _all: number
  }


  export type AnalysisAvgAggregateInputType = {
    totalElementosDetectados?: true
    elementosSanos?: true
    elementosEnfermos?: true
    porcentajeMermaGeneral?: true
    pesoSanoGramos?: true
    ubicacionLat?: true
    ubicacionLng?: true
  }

  export type AnalysisSumAggregateInputType = {
    totalElementosDetectados?: true
    elementosSanos?: true
    elementosEnfermos?: true
    porcentajeMermaGeneral?: true
    pesoSanoGramos?: true
    ubicacionLat?: true
    ubicacionLng?: true
  }

  export type AnalysisMinAggregateInputType = {
    id?: true
    imageId?: true
    storageKey?: true
    requesterUserId?: true
    requesterEmail?: true
    variedad?: true
    fechaAnalisis?: true
    totalElementosDetectados?: true
    elementosSanos?: true
    elementosEnfermos?: true
    porcentajeMermaGeneral?: true
    pesoSanoGramos?: true
    ubicacionLat?: true
    ubicacionLng?: true
    campoId?: true
    productorId?: true
    offlineSyncId?: true
    validacionEstado?: true
    validacionFueCorregido?: true
    validacionCorregidoPorId?: true
    validacionDiagnosticoOriginal?: true
    validacionObservaciones?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AnalysisMaxAggregateInputType = {
    id?: true
    imageId?: true
    storageKey?: true
    requesterUserId?: true
    requesterEmail?: true
    variedad?: true
    fechaAnalisis?: true
    totalElementosDetectados?: true
    elementosSanos?: true
    elementosEnfermos?: true
    porcentajeMermaGeneral?: true
    pesoSanoGramos?: true
    ubicacionLat?: true
    ubicacionLng?: true
    campoId?: true
    productorId?: true
    offlineSyncId?: true
    validacionEstado?: true
    validacionFueCorregido?: true
    validacionCorregidoPorId?: true
    validacionDiagnosticoOriginal?: true
    validacionObservaciones?: true
    createdAt?: true
    updatedAt?: true
  }

  export type AnalysisCountAggregateInputType = {
    id?: true
    imageId?: true
    storageKey?: true
    requesterUserId?: true
    requesterEmail?: true
    variedad?: true
    fechaAnalisis?: true
    totalElementosDetectados?: true
    elementosSanos?: true
    elementosEnfermos?: true
    porcentajeMermaGeneral?: true
    pesoSanoGramos?: true
    ubicacionLat?: true
    ubicacionLng?: true
    campoId?: true
    productorId?: true
    offlineSyncId?: true
    validacionEstado?: true
    validacionFueCorregido?: true
    validacionCorregidoPorId?: true
    validacionDiagnosticoOriginal?: true
    validacionCronogramaCorregido?: true
    validacionObservaciones?: true
    createdAt?: true
    updatedAt?: true
    _all?: true
  }

  export type AnalysisAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Analysis to aggregate.
     */
    where?: AnalysisWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Analyses to fetch.
     */
    orderBy?: AnalysisOrderByWithRelationInput | AnalysisOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: AnalysisWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Analyses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Analyses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned Analyses
    **/
    _count?: true | AnalysisCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: AnalysisAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: AnalysisSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: AnalysisMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: AnalysisMaxAggregateInputType
  }

  export type GetAnalysisAggregateType<T extends AnalysisAggregateArgs> = {
        [P in keyof T & keyof AggregateAnalysis]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateAnalysis[P]>
      : GetScalarType<T[P], AggregateAnalysis[P]>
  }




  export type AnalysisGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: AnalysisWhereInput
    orderBy?: AnalysisOrderByWithAggregationInput | AnalysisOrderByWithAggregationInput[]
    by: AnalysisScalarFieldEnum[] | AnalysisScalarFieldEnum
    having?: AnalysisScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: AnalysisCountAggregateInputType | true
    _avg?: AnalysisAvgAggregateInputType
    _sum?: AnalysisSumAggregateInputType
    _min?: AnalysisMinAggregateInputType
    _max?: AnalysisMaxAggregateInputType
  }

  export type AnalysisGroupByOutputType = {
    id: string
    imageId: string
    storageKey: string
    requesterUserId: string
    requesterEmail: string
    variedad: string | null
    fechaAnalisis: Date
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat: number | null
    ubicacionLng: number | null
    campoId: string
    productorId: string
    offlineSyncId: string | null
    validacionEstado: $Enums.EstadoValidacion
    validacionFueCorregido: boolean
    validacionCorregidoPorId: string | null
    validacionDiagnosticoOriginal: string | null
    validacionCronogramaCorregido: JsonValue | null
    validacionObservaciones: string | null
    createdAt: Date
    updatedAt: Date
    _count: AnalysisCountAggregateOutputType | null
    _avg: AnalysisAvgAggregateOutputType | null
    _sum: AnalysisSumAggregateOutputType | null
    _min: AnalysisMinAggregateOutputType | null
    _max: AnalysisMaxAggregateOutputType | null
  }

  type GetAnalysisGroupByPayload<T extends AnalysisGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<AnalysisGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof AnalysisGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], AnalysisGroupByOutputType[P]>
            : GetScalarType<T[P], AnalysisGroupByOutputType[P]>
        }
      >
    >


  export type AnalysisSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    imageId?: boolean
    storageKey?: boolean
    requesterUserId?: boolean
    requesterEmail?: boolean
    variedad?: boolean
    fechaAnalisis?: boolean
    totalElementosDetectados?: boolean
    elementosSanos?: boolean
    elementosEnfermos?: boolean
    porcentajeMermaGeneral?: boolean
    pesoSanoGramos?: boolean
    ubicacionLat?: boolean
    ubicacionLng?: boolean
    campoId?: boolean
    productorId?: boolean
    offlineSyncId?: boolean
    validacionEstado?: boolean
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: boolean
    validacionDiagnosticoOriginal?: boolean
    validacionCronogramaCorregido?: boolean
    validacionObservaciones?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    requester?: boolean | UserDefaultArgs<ExtArgs>
    productor?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
    validadoPor?: boolean | Analysis$validadoPorArgs<ExtArgs>
    fenologiaEtapas?: boolean | Analysis$fenologiaEtapasArgs<ExtArgs>
    _count?: boolean | AnalysisCountOutputTypeDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["analysis"]>

  export type AnalysisSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    imageId?: boolean
    storageKey?: boolean
    requesterUserId?: boolean
    requesterEmail?: boolean
    variedad?: boolean
    fechaAnalisis?: boolean
    totalElementosDetectados?: boolean
    elementosSanos?: boolean
    elementosEnfermos?: boolean
    porcentajeMermaGeneral?: boolean
    pesoSanoGramos?: boolean
    ubicacionLat?: boolean
    ubicacionLng?: boolean
    campoId?: boolean
    productorId?: boolean
    offlineSyncId?: boolean
    validacionEstado?: boolean
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: boolean
    validacionDiagnosticoOriginal?: boolean
    validacionCronogramaCorregido?: boolean
    validacionObservaciones?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    requester?: boolean | UserDefaultArgs<ExtArgs>
    productor?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
    validadoPor?: boolean | Analysis$validadoPorArgs<ExtArgs>
  }, ExtArgs["result"]["analysis"]>

  export type AnalysisSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    imageId?: boolean
    storageKey?: boolean
    requesterUserId?: boolean
    requesterEmail?: boolean
    variedad?: boolean
    fechaAnalisis?: boolean
    totalElementosDetectados?: boolean
    elementosSanos?: boolean
    elementosEnfermos?: boolean
    porcentajeMermaGeneral?: boolean
    pesoSanoGramos?: boolean
    ubicacionLat?: boolean
    ubicacionLng?: boolean
    campoId?: boolean
    productorId?: boolean
    offlineSyncId?: boolean
    validacionEstado?: boolean
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: boolean
    validacionDiagnosticoOriginal?: boolean
    validacionCronogramaCorregido?: boolean
    validacionObservaciones?: boolean
    createdAt?: boolean
    updatedAt?: boolean
    requester?: boolean | UserDefaultArgs<ExtArgs>
    productor?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
    validadoPor?: boolean | Analysis$validadoPorArgs<ExtArgs>
  }, ExtArgs["result"]["analysis"]>

  export type AnalysisSelectScalar = {
    id?: boolean
    imageId?: boolean
    storageKey?: boolean
    requesterUserId?: boolean
    requesterEmail?: boolean
    variedad?: boolean
    fechaAnalisis?: boolean
    totalElementosDetectados?: boolean
    elementosSanos?: boolean
    elementosEnfermos?: boolean
    porcentajeMermaGeneral?: boolean
    pesoSanoGramos?: boolean
    ubicacionLat?: boolean
    ubicacionLng?: boolean
    campoId?: boolean
    productorId?: boolean
    offlineSyncId?: boolean
    validacionEstado?: boolean
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: boolean
    validacionDiagnosticoOriginal?: boolean
    validacionCronogramaCorregido?: boolean
    validacionObservaciones?: boolean
    createdAt?: boolean
    updatedAt?: boolean
  }

  export type AnalysisOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "imageId" | "storageKey" | "requesterUserId" | "requesterEmail" | "variedad" | "fechaAnalisis" | "totalElementosDetectados" | "elementosSanos" | "elementosEnfermos" | "porcentajeMermaGeneral" | "pesoSanoGramos" | "ubicacionLat" | "ubicacionLng" | "campoId" | "productorId" | "offlineSyncId" | "validacionEstado" | "validacionFueCorregido" | "validacionCorregidoPorId" | "validacionDiagnosticoOriginal" | "validacionCronogramaCorregido" | "validacionObservaciones" | "createdAt" | "updatedAt", ExtArgs["result"]["analysis"]>
  export type AnalysisInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    requester?: boolean | UserDefaultArgs<ExtArgs>
    productor?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
    validadoPor?: boolean | Analysis$validadoPorArgs<ExtArgs>
    fenologiaEtapas?: boolean | Analysis$fenologiaEtapasArgs<ExtArgs>
    _count?: boolean | AnalysisCountOutputTypeDefaultArgs<ExtArgs>
  }
  export type AnalysisIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    requester?: boolean | UserDefaultArgs<ExtArgs>
    productor?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
    validadoPor?: boolean | Analysis$validadoPorArgs<ExtArgs>
  }
  export type AnalysisIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    requester?: boolean | UserDefaultArgs<ExtArgs>
    productor?: boolean | UserDefaultArgs<ExtArgs>
    campo?: boolean | CampoDefaultArgs<ExtArgs>
    validadoPor?: boolean | Analysis$validadoPorArgs<ExtArgs>
  }

  export type $AnalysisPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "Analysis"
    objects: {
      requester: Prisma.$UserPayload<ExtArgs>
      productor: Prisma.$UserPayload<ExtArgs>
      campo: Prisma.$CampoPayload<ExtArgs>
      validadoPor: Prisma.$UserPayload<ExtArgs> | null
      fenologiaEtapas: Prisma.$FenologiaEtapaPayload<ExtArgs>[]
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      imageId: string
      storageKey: string
      requesterUserId: string
      requesterEmail: string
      variedad: string | null
      fechaAnalisis: Date
      totalElementosDetectados: number
      elementosSanos: number
      elementosEnfermos: number
      porcentajeMermaGeneral: number
      pesoSanoGramos: number
      ubicacionLat: number | null
      ubicacionLng: number | null
      campoId: string
      productorId: string
      offlineSyncId: string | null
      validacionEstado: $Enums.EstadoValidacion
      validacionFueCorregido: boolean
      validacionCorregidoPorId: string | null
      validacionDiagnosticoOriginal: string | null
      validacionCronogramaCorregido: Prisma.JsonValue | null
      validacionObservaciones: string | null
      createdAt: Date
      updatedAt: Date
    }, ExtArgs["result"]["analysis"]>
    composites: {}
  }

  type AnalysisGetPayload<S extends boolean | null | undefined | AnalysisDefaultArgs> = $Result.GetResult<Prisma.$AnalysisPayload, S>

  type AnalysisCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<AnalysisFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: AnalysisCountAggregateInputType | true
    }

  export interface AnalysisDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['Analysis'], meta: { name: 'Analysis' } }
    /**
     * Find zero or one Analysis that matches the filter.
     * @param {AnalysisFindUniqueArgs} args - Arguments to find a Analysis
     * @example
     * // Get one Analysis
     * const analysis = await prisma.analysis.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends AnalysisFindUniqueArgs>(args: SelectSubset<T, AnalysisFindUniqueArgs<ExtArgs>>): Prisma__AnalysisClient<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one Analysis that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {AnalysisFindUniqueOrThrowArgs} args - Arguments to find a Analysis
     * @example
     * // Get one Analysis
     * const analysis = await prisma.analysis.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends AnalysisFindUniqueOrThrowArgs>(args: SelectSubset<T, AnalysisFindUniqueOrThrowArgs<ExtArgs>>): Prisma__AnalysisClient<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Analysis that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisFindFirstArgs} args - Arguments to find a Analysis
     * @example
     * // Get one Analysis
     * const analysis = await prisma.analysis.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends AnalysisFindFirstArgs>(args?: SelectSubset<T, AnalysisFindFirstArgs<ExtArgs>>): Prisma__AnalysisClient<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first Analysis that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisFindFirstOrThrowArgs} args - Arguments to find a Analysis
     * @example
     * // Get one Analysis
     * const analysis = await prisma.analysis.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends AnalysisFindFirstOrThrowArgs>(args?: SelectSubset<T, AnalysisFindFirstOrThrowArgs<ExtArgs>>): Prisma__AnalysisClient<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more Analyses that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all Analyses
     * const analyses = await prisma.analysis.findMany()
     * 
     * // Get first 10 Analyses
     * const analyses = await prisma.analysis.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const analysisWithIdOnly = await prisma.analysis.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends AnalysisFindManyArgs>(args?: SelectSubset<T, AnalysisFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a Analysis.
     * @param {AnalysisCreateArgs} args - Arguments to create a Analysis.
     * @example
     * // Create one Analysis
     * const Analysis = await prisma.analysis.create({
     *   data: {
     *     // ... data to create a Analysis
     *   }
     * })
     * 
     */
    create<T extends AnalysisCreateArgs>(args: SelectSubset<T, AnalysisCreateArgs<ExtArgs>>): Prisma__AnalysisClient<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many Analyses.
     * @param {AnalysisCreateManyArgs} args - Arguments to create many Analyses.
     * @example
     * // Create many Analyses
     * const analysis = await prisma.analysis.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends AnalysisCreateManyArgs>(args?: SelectSubset<T, AnalysisCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many Analyses and returns the data saved in the database.
     * @param {AnalysisCreateManyAndReturnArgs} args - Arguments to create many Analyses.
     * @example
     * // Create many Analyses
     * const analysis = await prisma.analysis.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many Analyses and only return the `id`
     * const analysisWithIdOnly = await prisma.analysis.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends AnalysisCreateManyAndReturnArgs>(args?: SelectSubset<T, AnalysisCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a Analysis.
     * @param {AnalysisDeleteArgs} args - Arguments to delete one Analysis.
     * @example
     * // Delete one Analysis
     * const Analysis = await prisma.analysis.delete({
     *   where: {
     *     // ... filter to delete one Analysis
     *   }
     * })
     * 
     */
    delete<T extends AnalysisDeleteArgs>(args: SelectSubset<T, AnalysisDeleteArgs<ExtArgs>>): Prisma__AnalysisClient<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one Analysis.
     * @param {AnalysisUpdateArgs} args - Arguments to update one Analysis.
     * @example
     * // Update one Analysis
     * const analysis = await prisma.analysis.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends AnalysisUpdateArgs>(args: SelectSubset<T, AnalysisUpdateArgs<ExtArgs>>): Prisma__AnalysisClient<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more Analyses.
     * @param {AnalysisDeleteManyArgs} args - Arguments to filter Analyses to delete.
     * @example
     * // Delete a few Analyses
     * const { count } = await prisma.analysis.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends AnalysisDeleteManyArgs>(args?: SelectSubset<T, AnalysisDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Analyses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many Analyses
     * const analysis = await prisma.analysis.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends AnalysisUpdateManyArgs>(args: SelectSubset<T, AnalysisUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more Analyses and returns the data updated in the database.
     * @param {AnalysisUpdateManyAndReturnArgs} args - Arguments to update many Analyses.
     * @example
     * // Update many Analyses
     * const analysis = await prisma.analysis.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more Analyses and only return the `id`
     * const analysisWithIdOnly = await prisma.analysis.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends AnalysisUpdateManyAndReturnArgs>(args: SelectSubset<T, AnalysisUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one Analysis.
     * @param {AnalysisUpsertArgs} args - Arguments to update or create a Analysis.
     * @example
     * // Update or create a Analysis
     * const analysis = await prisma.analysis.upsert({
     *   create: {
     *     // ... data to create a Analysis
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the Analysis we want to update
     *   }
     * })
     */
    upsert<T extends AnalysisUpsertArgs>(args: SelectSubset<T, AnalysisUpsertArgs<ExtArgs>>): Prisma__AnalysisClient<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of Analyses.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisCountArgs} args - Arguments to filter Analyses to count.
     * @example
     * // Count the number of Analyses
     * const count = await prisma.analysis.count({
     *   where: {
     *     // ... the filter for the Analyses we want to count
     *   }
     * })
    **/
    count<T extends AnalysisCountArgs>(
      args?: Subset<T, AnalysisCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], AnalysisCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a Analysis.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends AnalysisAggregateArgs>(args: Subset<T, AnalysisAggregateArgs>): Prisma.PrismaPromise<GetAnalysisAggregateType<T>>

    /**
     * Group by Analysis.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {AnalysisGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends AnalysisGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: AnalysisGroupByArgs['orderBy'] }
        : { orderBy?: AnalysisGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, AnalysisGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetAnalysisGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the Analysis model
   */
  readonly fields: AnalysisFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for Analysis.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__AnalysisClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    requester<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    productor<T extends UserDefaultArgs<ExtArgs> = {}>(args?: Subset<T, UserDefaultArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    campo<T extends CampoDefaultArgs<ExtArgs> = {}>(args?: Subset<T, CampoDefaultArgs<ExtArgs>>): Prisma__CampoClient<$Result.GetResult<Prisma.$CampoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    validadoPor<T extends Analysis$validadoPorArgs<ExtArgs> = {}>(args?: Subset<T, Analysis$validadoPorArgs<ExtArgs>>): Prisma__UserClient<$Result.GetResult<Prisma.$UserPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>
    fenologiaEtapas<T extends Analysis$fenologiaEtapasArgs<ExtArgs> = {}>(args?: Subset<T, Analysis$fenologiaEtapasArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FenologiaEtapaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions> | Null>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the Analysis model
   */
  interface AnalysisFieldRefs {
    readonly id: FieldRef<"Analysis", 'String'>
    readonly imageId: FieldRef<"Analysis", 'String'>
    readonly storageKey: FieldRef<"Analysis", 'String'>
    readonly requesterUserId: FieldRef<"Analysis", 'String'>
    readonly requesterEmail: FieldRef<"Analysis", 'String'>
    readonly variedad: FieldRef<"Analysis", 'String'>
    readonly fechaAnalisis: FieldRef<"Analysis", 'DateTime'>
    readonly totalElementosDetectados: FieldRef<"Analysis", 'Int'>
    readonly elementosSanos: FieldRef<"Analysis", 'Int'>
    readonly elementosEnfermos: FieldRef<"Analysis", 'Int'>
    readonly porcentajeMermaGeneral: FieldRef<"Analysis", 'Float'>
    readonly pesoSanoGramos: FieldRef<"Analysis", 'Float'>
    readonly ubicacionLat: FieldRef<"Analysis", 'Float'>
    readonly ubicacionLng: FieldRef<"Analysis", 'Float'>
    readonly campoId: FieldRef<"Analysis", 'String'>
    readonly productorId: FieldRef<"Analysis", 'String'>
    readonly offlineSyncId: FieldRef<"Analysis", 'String'>
    readonly validacionEstado: FieldRef<"Analysis", 'EstadoValidacion'>
    readonly validacionFueCorregido: FieldRef<"Analysis", 'Boolean'>
    readonly validacionCorregidoPorId: FieldRef<"Analysis", 'String'>
    readonly validacionDiagnosticoOriginal: FieldRef<"Analysis", 'String'>
    readonly validacionCronogramaCorregido: FieldRef<"Analysis", 'Json'>
    readonly validacionObservaciones: FieldRef<"Analysis", 'String'>
    readonly createdAt: FieldRef<"Analysis", 'DateTime'>
    readonly updatedAt: FieldRef<"Analysis", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * Analysis findUnique
   */
  export type AnalysisFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    /**
     * Filter, which Analysis to fetch.
     */
    where: AnalysisWhereUniqueInput
  }

  /**
   * Analysis findUniqueOrThrow
   */
  export type AnalysisFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    /**
     * Filter, which Analysis to fetch.
     */
    where: AnalysisWhereUniqueInput
  }

  /**
   * Analysis findFirst
   */
  export type AnalysisFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    /**
     * Filter, which Analysis to fetch.
     */
    where?: AnalysisWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Analyses to fetch.
     */
    orderBy?: AnalysisOrderByWithRelationInput | AnalysisOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Analyses.
     */
    cursor?: AnalysisWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Analyses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Analyses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Analyses.
     */
    distinct?: AnalysisScalarFieldEnum | AnalysisScalarFieldEnum[]
  }

  /**
   * Analysis findFirstOrThrow
   */
  export type AnalysisFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    /**
     * Filter, which Analysis to fetch.
     */
    where?: AnalysisWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Analyses to fetch.
     */
    orderBy?: AnalysisOrderByWithRelationInput | AnalysisOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for Analyses.
     */
    cursor?: AnalysisWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Analyses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Analyses.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of Analyses.
     */
    distinct?: AnalysisScalarFieldEnum | AnalysisScalarFieldEnum[]
  }

  /**
   * Analysis findMany
   */
  export type AnalysisFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    /**
     * Filter, which Analyses to fetch.
     */
    where?: AnalysisWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of Analyses to fetch.
     */
    orderBy?: AnalysisOrderByWithRelationInput | AnalysisOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing Analyses.
     */
    cursor?: AnalysisWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` Analyses from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` Analyses.
     */
    skip?: number
    distinct?: AnalysisScalarFieldEnum | AnalysisScalarFieldEnum[]
  }

  /**
   * Analysis create
   */
  export type AnalysisCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    /**
     * The data needed to create a Analysis.
     */
    data: XOR<AnalysisCreateInput, AnalysisUncheckedCreateInput>
  }

  /**
   * Analysis createMany
   */
  export type AnalysisCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many Analyses.
     */
    data: AnalysisCreateManyInput | AnalysisCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * Analysis createManyAndReturn
   */
  export type AnalysisCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * The data used to create many Analyses.
     */
    data: AnalysisCreateManyInput | AnalysisCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * Analysis update
   */
  export type AnalysisUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    /**
     * The data needed to update a Analysis.
     */
    data: XOR<AnalysisUpdateInput, AnalysisUncheckedUpdateInput>
    /**
     * Choose, which Analysis to update.
     */
    where: AnalysisWhereUniqueInput
  }

  /**
   * Analysis updateMany
   */
  export type AnalysisUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update Analyses.
     */
    data: XOR<AnalysisUpdateManyMutationInput, AnalysisUncheckedUpdateManyInput>
    /**
     * Filter which Analyses to update
     */
    where?: AnalysisWhereInput
    /**
     * Limit how many Analyses to update.
     */
    limit?: number
  }

  /**
   * Analysis updateManyAndReturn
   */
  export type AnalysisUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * The data used to update Analyses.
     */
    data: XOR<AnalysisUpdateManyMutationInput, AnalysisUncheckedUpdateManyInput>
    /**
     * Filter which Analyses to update
     */
    where?: AnalysisWhereInput
    /**
     * Limit how many Analyses to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * Analysis upsert
   */
  export type AnalysisUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    /**
     * The filter to search for the Analysis to update in case it exists.
     */
    where: AnalysisWhereUniqueInput
    /**
     * In case the Analysis found by the `where` argument doesn't exist, create a new Analysis with this data.
     */
    create: XOR<AnalysisCreateInput, AnalysisUncheckedCreateInput>
    /**
     * In case the Analysis was found with the provided `where` argument, update it with this data.
     */
    update: XOR<AnalysisUpdateInput, AnalysisUncheckedUpdateInput>
  }

  /**
   * Analysis delete
   */
  export type AnalysisDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
    /**
     * Filter which Analysis to delete.
     */
    where: AnalysisWhereUniqueInput
  }

  /**
   * Analysis deleteMany
   */
  export type AnalysisDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which Analyses to delete
     */
    where?: AnalysisWhereInput
    /**
     * Limit how many Analyses to delete.
     */
    limit?: number
  }

  /**
   * Analysis.validadoPor
   */
  export type Analysis$validadoPorArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the User
     */
    select?: UserSelect<ExtArgs> | null
    /**
     * Omit specific fields from the User
     */
    omit?: UserOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: UserInclude<ExtArgs> | null
    where?: UserWhereInput
  }

  /**
   * Analysis.fenologiaEtapas
   */
  export type Analysis$fenologiaEtapasArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaInclude<ExtArgs> | null
    where?: FenologiaEtapaWhereInput
    orderBy?: FenologiaEtapaOrderByWithRelationInput | FenologiaEtapaOrderByWithRelationInput[]
    cursor?: FenologiaEtapaWhereUniqueInput
    take?: number
    skip?: number
    distinct?: FenologiaEtapaScalarFieldEnum | FenologiaEtapaScalarFieldEnum[]
  }

  /**
   * Analysis without action
   */
  export type AnalysisDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the Analysis
     */
    select?: AnalysisSelect<ExtArgs> | null
    /**
     * Omit specific fields from the Analysis
     */
    omit?: AnalysisOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: AnalysisInclude<ExtArgs> | null
  }


  /**
   * Model FenologiaEtapa
   */

  export type AggregateFenologiaEtapa = {
    _count: FenologiaEtapaCountAggregateOutputType | null
    _avg: FenologiaEtapaAvgAggregateOutputType | null
    _sum: FenologiaEtapaSumAggregateOutputType | null
    _min: FenologiaEtapaMinAggregateOutputType | null
    _max: FenologiaEtapaMaxAggregateOutputType | null
  }

  export type FenologiaEtapaAvgAggregateOutputType = {
    cantidad: number | null
    enDias: number | null
    diasParaCosecha: number | null
  }

  export type FenologiaEtapaSumAggregateOutputType = {
    cantidad: number | null
    enDias: number | null
    diasParaCosecha: number | null
  }

  export type FenologiaEtapaMinAggregateOutputType = {
    id: string | null
    analysisId: string | null
    etapa: string | null
    cantidad: number | null
    cambiaA: string | null
    enDias: number | null
    diasParaCosecha: number | null
  }

  export type FenologiaEtapaMaxAggregateOutputType = {
    id: string | null
    analysisId: string | null
    etapa: string | null
    cantidad: number | null
    cambiaA: string | null
    enDias: number | null
    diasParaCosecha: number | null
  }

  export type FenologiaEtapaCountAggregateOutputType = {
    id: number
    analysisId: number
    etapa: number
    cantidad: number
    cambiaA: number
    enDias: number
    diasParaCosecha: number
    _all: number
  }


  export type FenologiaEtapaAvgAggregateInputType = {
    cantidad?: true
    enDias?: true
    diasParaCosecha?: true
  }

  export type FenologiaEtapaSumAggregateInputType = {
    cantidad?: true
    enDias?: true
    diasParaCosecha?: true
  }

  export type FenologiaEtapaMinAggregateInputType = {
    id?: true
    analysisId?: true
    etapa?: true
    cantidad?: true
    cambiaA?: true
    enDias?: true
    diasParaCosecha?: true
  }

  export type FenologiaEtapaMaxAggregateInputType = {
    id?: true
    analysisId?: true
    etapa?: true
    cantidad?: true
    cambiaA?: true
    enDias?: true
    diasParaCosecha?: true
  }

  export type FenologiaEtapaCountAggregateInputType = {
    id?: true
    analysisId?: true
    etapa?: true
    cantidad?: true
    cambiaA?: true
    enDias?: true
    diasParaCosecha?: true
    _all?: true
  }

  export type FenologiaEtapaAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FenologiaEtapa to aggregate.
     */
    where?: FenologiaEtapaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FenologiaEtapas to fetch.
     */
    orderBy?: FenologiaEtapaOrderByWithRelationInput | FenologiaEtapaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: FenologiaEtapaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FenologiaEtapas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FenologiaEtapas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned FenologiaEtapas
    **/
    _count?: true | FenologiaEtapaCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: FenologiaEtapaAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: FenologiaEtapaSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: FenologiaEtapaMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: FenologiaEtapaMaxAggregateInputType
  }

  export type GetFenologiaEtapaAggregateType<T extends FenologiaEtapaAggregateArgs> = {
        [P in keyof T & keyof AggregateFenologiaEtapa]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateFenologiaEtapa[P]>
      : GetScalarType<T[P], AggregateFenologiaEtapa[P]>
  }




  export type FenologiaEtapaGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: FenologiaEtapaWhereInput
    orderBy?: FenologiaEtapaOrderByWithAggregationInput | FenologiaEtapaOrderByWithAggregationInput[]
    by: FenologiaEtapaScalarFieldEnum[] | FenologiaEtapaScalarFieldEnum
    having?: FenologiaEtapaScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: FenologiaEtapaCountAggregateInputType | true
    _avg?: FenologiaEtapaAvgAggregateInputType
    _sum?: FenologiaEtapaSumAggregateInputType
    _min?: FenologiaEtapaMinAggregateInputType
    _max?: FenologiaEtapaMaxAggregateInputType
  }

  export type FenologiaEtapaGroupByOutputType = {
    id: string
    analysisId: string
    etapa: string
    cantidad: number
    cambiaA: string
    enDias: number
    diasParaCosecha: number
    _count: FenologiaEtapaCountAggregateOutputType | null
    _avg: FenologiaEtapaAvgAggregateOutputType | null
    _sum: FenologiaEtapaSumAggregateOutputType | null
    _min: FenologiaEtapaMinAggregateOutputType | null
    _max: FenologiaEtapaMaxAggregateOutputType | null
  }

  type GetFenologiaEtapaGroupByPayload<T extends FenologiaEtapaGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<FenologiaEtapaGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof FenologiaEtapaGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], FenologiaEtapaGroupByOutputType[P]>
            : GetScalarType<T[P], FenologiaEtapaGroupByOutputType[P]>
        }
      >
    >


  export type FenologiaEtapaSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    analysisId?: boolean
    etapa?: boolean
    cantidad?: boolean
    cambiaA?: boolean
    enDias?: boolean
    diasParaCosecha?: boolean
    analysis?: boolean | AnalysisDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["fenologiaEtapa"]>

  export type FenologiaEtapaSelectCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    analysisId?: boolean
    etapa?: boolean
    cantidad?: boolean
    cambiaA?: boolean
    enDias?: boolean
    diasParaCosecha?: boolean
    analysis?: boolean | AnalysisDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["fenologiaEtapa"]>

  export type FenologiaEtapaSelectUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    analysisId?: boolean
    etapa?: boolean
    cantidad?: boolean
    cambiaA?: boolean
    enDias?: boolean
    diasParaCosecha?: boolean
    analysis?: boolean | AnalysisDefaultArgs<ExtArgs>
  }, ExtArgs["result"]["fenologiaEtapa"]>

  export type FenologiaEtapaSelectScalar = {
    id?: boolean
    analysisId?: boolean
    etapa?: boolean
    cantidad?: boolean
    cambiaA?: boolean
    enDias?: boolean
    diasParaCosecha?: boolean
  }

  export type FenologiaEtapaOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "analysisId" | "etapa" | "cantidad" | "cambiaA" | "enDias" | "diasParaCosecha", ExtArgs["result"]["fenologiaEtapa"]>
  export type FenologiaEtapaInclude<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    analysis?: boolean | AnalysisDefaultArgs<ExtArgs>
  }
  export type FenologiaEtapaIncludeCreateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    analysis?: boolean | AnalysisDefaultArgs<ExtArgs>
  }
  export type FenologiaEtapaIncludeUpdateManyAndReturn<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    analysis?: boolean | AnalysisDefaultArgs<ExtArgs>
  }

  export type $FenologiaEtapaPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "FenologiaEtapa"
    objects: {
      analysis: Prisma.$AnalysisPayload<ExtArgs>
    }
    scalars: $Extensions.GetPayloadResult<{
      id: string
      analysisId: string
      etapa: string
      cantidad: number
      cambiaA: string
      enDias: number
      diasParaCosecha: number
    }, ExtArgs["result"]["fenologiaEtapa"]>
    composites: {}
  }

  type FenologiaEtapaGetPayload<S extends boolean | null | undefined | FenologiaEtapaDefaultArgs> = $Result.GetResult<Prisma.$FenologiaEtapaPayload, S>

  type FenologiaEtapaCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<FenologiaEtapaFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: FenologiaEtapaCountAggregateInputType | true
    }

  export interface FenologiaEtapaDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['FenologiaEtapa'], meta: { name: 'FenologiaEtapa' } }
    /**
     * Find zero or one FenologiaEtapa that matches the filter.
     * @param {FenologiaEtapaFindUniqueArgs} args - Arguments to find a FenologiaEtapa
     * @example
     * // Get one FenologiaEtapa
     * const fenologiaEtapa = await prisma.fenologiaEtapa.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends FenologiaEtapaFindUniqueArgs>(args: SelectSubset<T, FenologiaEtapaFindUniqueArgs<ExtArgs>>): Prisma__FenologiaEtapaClient<$Result.GetResult<Prisma.$FenologiaEtapaPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one FenologiaEtapa that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {FenologiaEtapaFindUniqueOrThrowArgs} args - Arguments to find a FenologiaEtapa
     * @example
     * // Get one FenologiaEtapa
     * const fenologiaEtapa = await prisma.fenologiaEtapa.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends FenologiaEtapaFindUniqueOrThrowArgs>(args: SelectSubset<T, FenologiaEtapaFindUniqueOrThrowArgs<ExtArgs>>): Prisma__FenologiaEtapaClient<$Result.GetResult<Prisma.$FenologiaEtapaPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FenologiaEtapa that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FenologiaEtapaFindFirstArgs} args - Arguments to find a FenologiaEtapa
     * @example
     * // Get one FenologiaEtapa
     * const fenologiaEtapa = await prisma.fenologiaEtapa.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends FenologiaEtapaFindFirstArgs>(args?: SelectSubset<T, FenologiaEtapaFindFirstArgs<ExtArgs>>): Prisma__FenologiaEtapaClient<$Result.GetResult<Prisma.$FenologiaEtapaPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first FenologiaEtapa that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FenologiaEtapaFindFirstOrThrowArgs} args - Arguments to find a FenologiaEtapa
     * @example
     * // Get one FenologiaEtapa
     * const fenologiaEtapa = await prisma.fenologiaEtapa.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends FenologiaEtapaFindFirstOrThrowArgs>(args?: SelectSubset<T, FenologiaEtapaFindFirstOrThrowArgs<ExtArgs>>): Prisma__FenologiaEtapaClient<$Result.GetResult<Prisma.$FenologiaEtapaPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more FenologiaEtapas that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FenologiaEtapaFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all FenologiaEtapas
     * const fenologiaEtapas = await prisma.fenologiaEtapa.findMany()
     * 
     * // Get first 10 FenologiaEtapas
     * const fenologiaEtapas = await prisma.fenologiaEtapa.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const fenologiaEtapaWithIdOnly = await prisma.fenologiaEtapa.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends FenologiaEtapaFindManyArgs>(args?: SelectSubset<T, FenologiaEtapaFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FenologiaEtapaPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a FenologiaEtapa.
     * @param {FenologiaEtapaCreateArgs} args - Arguments to create a FenologiaEtapa.
     * @example
     * // Create one FenologiaEtapa
     * const FenologiaEtapa = await prisma.fenologiaEtapa.create({
     *   data: {
     *     // ... data to create a FenologiaEtapa
     *   }
     * })
     * 
     */
    create<T extends FenologiaEtapaCreateArgs>(args: SelectSubset<T, FenologiaEtapaCreateArgs<ExtArgs>>): Prisma__FenologiaEtapaClient<$Result.GetResult<Prisma.$FenologiaEtapaPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many FenologiaEtapas.
     * @param {FenologiaEtapaCreateManyArgs} args - Arguments to create many FenologiaEtapas.
     * @example
     * // Create many FenologiaEtapas
     * const fenologiaEtapa = await prisma.fenologiaEtapa.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends FenologiaEtapaCreateManyArgs>(args?: SelectSubset<T, FenologiaEtapaCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create many FenologiaEtapas and returns the data saved in the database.
     * @param {FenologiaEtapaCreateManyAndReturnArgs} args - Arguments to create many FenologiaEtapas.
     * @example
     * // Create many FenologiaEtapas
     * const fenologiaEtapa = await prisma.fenologiaEtapa.createManyAndReturn({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Create many FenologiaEtapas and only return the `id`
     * const fenologiaEtapaWithIdOnly = await prisma.fenologiaEtapa.createManyAndReturn({
     *   select: { id: true },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    createManyAndReturn<T extends FenologiaEtapaCreateManyAndReturnArgs>(args?: SelectSubset<T, FenologiaEtapaCreateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FenologiaEtapaPayload<ExtArgs>, T, "createManyAndReturn", GlobalOmitOptions>>

    /**
     * Delete a FenologiaEtapa.
     * @param {FenologiaEtapaDeleteArgs} args - Arguments to delete one FenologiaEtapa.
     * @example
     * // Delete one FenologiaEtapa
     * const FenologiaEtapa = await prisma.fenologiaEtapa.delete({
     *   where: {
     *     // ... filter to delete one FenologiaEtapa
     *   }
     * })
     * 
     */
    delete<T extends FenologiaEtapaDeleteArgs>(args: SelectSubset<T, FenologiaEtapaDeleteArgs<ExtArgs>>): Prisma__FenologiaEtapaClient<$Result.GetResult<Prisma.$FenologiaEtapaPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one FenologiaEtapa.
     * @param {FenologiaEtapaUpdateArgs} args - Arguments to update one FenologiaEtapa.
     * @example
     * // Update one FenologiaEtapa
     * const fenologiaEtapa = await prisma.fenologiaEtapa.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends FenologiaEtapaUpdateArgs>(args: SelectSubset<T, FenologiaEtapaUpdateArgs<ExtArgs>>): Prisma__FenologiaEtapaClient<$Result.GetResult<Prisma.$FenologiaEtapaPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more FenologiaEtapas.
     * @param {FenologiaEtapaDeleteManyArgs} args - Arguments to filter FenologiaEtapas to delete.
     * @example
     * // Delete a few FenologiaEtapas
     * const { count } = await prisma.fenologiaEtapa.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends FenologiaEtapaDeleteManyArgs>(args?: SelectSubset<T, FenologiaEtapaDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FenologiaEtapas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FenologiaEtapaUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many FenologiaEtapas
     * const fenologiaEtapa = await prisma.fenologiaEtapa.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends FenologiaEtapaUpdateManyArgs>(args: SelectSubset<T, FenologiaEtapaUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more FenologiaEtapas and returns the data updated in the database.
     * @param {FenologiaEtapaUpdateManyAndReturnArgs} args - Arguments to update many FenologiaEtapas.
     * @example
     * // Update many FenologiaEtapas
     * const fenologiaEtapa = await prisma.fenologiaEtapa.updateManyAndReturn({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * 
     * // Update zero or more FenologiaEtapas and only return the `id`
     * const fenologiaEtapaWithIdOnly = await prisma.fenologiaEtapa.updateManyAndReturn({
     *   select: { id: true },
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * 
     */
    updateManyAndReturn<T extends FenologiaEtapaUpdateManyAndReturnArgs>(args: SelectSubset<T, FenologiaEtapaUpdateManyAndReturnArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$FenologiaEtapaPayload<ExtArgs>, T, "updateManyAndReturn", GlobalOmitOptions>>

    /**
     * Create or update one FenologiaEtapa.
     * @param {FenologiaEtapaUpsertArgs} args - Arguments to update or create a FenologiaEtapa.
     * @example
     * // Update or create a FenologiaEtapa
     * const fenologiaEtapa = await prisma.fenologiaEtapa.upsert({
     *   create: {
     *     // ... data to create a FenologiaEtapa
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the FenologiaEtapa we want to update
     *   }
     * })
     */
    upsert<T extends FenologiaEtapaUpsertArgs>(args: SelectSubset<T, FenologiaEtapaUpsertArgs<ExtArgs>>): Prisma__FenologiaEtapaClient<$Result.GetResult<Prisma.$FenologiaEtapaPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of FenologiaEtapas.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FenologiaEtapaCountArgs} args - Arguments to filter FenologiaEtapas to count.
     * @example
     * // Count the number of FenologiaEtapas
     * const count = await prisma.fenologiaEtapa.count({
     *   where: {
     *     // ... the filter for the FenologiaEtapas we want to count
     *   }
     * })
    **/
    count<T extends FenologiaEtapaCountArgs>(
      args?: Subset<T, FenologiaEtapaCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], FenologiaEtapaCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a FenologiaEtapa.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FenologiaEtapaAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends FenologiaEtapaAggregateArgs>(args: Subset<T, FenologiaEtapaAggregateArgs>): Prisma.PrismaPromise<GetFenologiaEtapaAggregateType<T>>

    /**
     * Group by FenologiaEtapa.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {FenologiaEtapaGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends FenologiaEtapaGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: FenologiaEtapaGroupByArgs['orderBy'] }
        : { orderBy?: FenologiaEtapaGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, FenologiaEtapaGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetFenologiaEtapaGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the FenologiaEtapa model
   */
  readonly fields: FenologiaEtapaFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for FenologiaEtapa.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__FenologiaEtapaClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    analysis<T extends AnalysisDefaultArgs<ExtArgs> = {}>(args?: Subset<T, AnalysisDefaultArgs<ExtArgs>>): Prisma__AnalysisClient<$Result.GetResult<Prisma.$AnalysisPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions> | Null, Null, ExtArgs, GlobalOmitOptions>
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the FenologiaEtapa model
   */
  interface FenologiaEtapaFieldRefs {
    readonly id: FieldRef<"FenologiaEtapa", 'String'>
    readonly analysisId: FieldRef<"FenologiaEtapa", 'String'>
    readonly etapa: FieldRef<"FenologiaEtapa", 'String'>
    readonly cantidad: FieldRef<"FenologiaEtapa", 'Int'>
    readonly cambiaA: FieldRef<"FenologiaEtapa", 'String'>
    readonly enDias: FieldRef<"FenologiaEtapa", 'Int'>
    readonly diasParaCosecha: FieldRef<"FenologiaEtapa", 'Int'>
  }
    

  // Custom InputTypes
  /**
   * FenologiaEtapa findUnique
   */
  export type FenologiaEtapaFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaInclude<ExtArgs> | null
    /**
     * Filter, which FenologiaEtapa to fetch.
     */
    where: FenologiaEtapaWhereUniqueInput
  }

  /**
   * FenologiaEtapa findUniqueOrThrow
   */
  export type FenologiaEtapaFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaInclude<ExtArgs> | null
    /**
     * Filter, which FenologiaEtapa to fetch.
     */
    where: FenologiaEtapaWhereUniqueInput
  }

  /**
   * FenologiaEtapa findFirst
   */
  export type FenologiaEtapaFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaInclude<ExtArgs> | null
    /**
     * Filter, which FenologiaEtapa to fetch.
     */
    where?: FenologiaEtapaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FenologiaEtapas to fetch.
     */
    orderBy?: FenologiaEtapaOrderByWithRelationInput | FenologiaEtapaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FenologiaEtapas.
     */
    cursor?: FenologiaEtapaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FenologiaEtapas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FenologiaEtapas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FenologiaEtapas.
     */
    distinct?: FenologiaEtapaScalarFieldEnum | FenologiaEtapaScalarFieldEnum[]
  }

  /**
   * FenologiaEtapa findFirstOrThrow
   */
  export type FenologiaEtapaFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaInclude<ExtArgs> | null
    /**
     * Filter, which FenologiaEtapa to fetch.
     */
    where?: FenologiaEtapaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FenologiaEtapas to fetch.
     */
    orderBy?: FenologiaEtapaOrderByWithRelationInput | FenologiaEtapaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for FenologiaEtapas.
     */
    cursor?: FenologiaEtapaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FenologiaEtapas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FenologiaEtapas.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of FenologiaEtapas.
     */
    distinct?: FenologiaEtapaScalarFieldEnum | FenologiaEtapaScalarFieldEnum[]
  }

  /**
   * FenologiaEtapa findMany
   */
  export type FenologiaEtapaFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaInclude<ExtArgs> | null
    /**
     * Filter, which FenologiaEtapas to fetch.
     */
    where?: FenologiaEtapaWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of FenologiaEtapas to fetch.
     */
    orderBy?: FenologiaEtapaOrderByWithRelationInput | FenologiaEtapaOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing FenologiaEtapas.
     */
    cursor?: FenologiaEtapaWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` FenologiaEtapas from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` FenologiaEtapas.
     */
    skip?: number
    distinct?: FenologiaEtapaScalarFieldEnum | FenologiaEtapaScalarFieldEnum[]
  }

  /**
   * FenologiaEtapa create
   */
  export type FenologiaEtapaCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaInclude<ExtArgs> | null
    /**
     * The data needed to create a FenologiaEtapa.
     */
    data: XOR<FenologiaEtapaCreateInput, FenologiaEtapaUncheckedCreateInput>
  }

  /**
   * FenologiaEtapa createMany
   */
  export type FenologiaEtapaCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many FenologiaEtapas.
     */
    data: FenologiaEtapaCreateManyInput | FenologiaEtapaCreateManyInput[]
    skipDuplicates?: boolean
  }

  /**
   * FenologiaEtapa createManyAndReturn
   */
  export type FenologiaEtapaCreateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelectCreateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * The data used to create many FenologiaEtapas.
     */
    data: FenologiaEtapaCreateManyInput | FenologiaEtapaCreateManyInput[]
    skipDuplicates?: boolean
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaIncludeCreateManyAndReturn<ExtArgs> | null
  }

  /**
   * FenologiaEtapa update
   */
  export type FenologiaEtapaUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaInclude<ExtArgs> | null
    /**
     * The data needed to update a FenologiaEtapa.
     */
    data: XOR<FenologiaEtapaUpdateInput, FenologiaEtapaUncheckedUpdateInput>
    /**
     * Choose, which FenologiaEtapa to update.
     */
    where: FenologiaEtapaWhereUniqueInput
  }

  /**
   * FenologiaEtapa updateMany
   */
  export type FenologiaEtapaUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update FenologiaEtapas.
     */
    data: XOR<FenologiaEtapaUpdateManyMutationInput, FenologiaEtapaUncheckedUpdateManyInput>
    /**
     * Filter which FenologiaEtapas to update
     */
    where?: FenologiaEtapaWhereInput
    /**
     * Limit how many FenologiaEtapas to update.
     */
    limit?: number
  }

  /**
   * FenologiaEtapa updateManyAndReturn
   */
  export type FenologiaEtapaUpdateManyAndReturnArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelectUpdateManyAndReturn<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * The data used to update FenologiaEtapas.
     */
    data: XOR<FenologiaEtapaUpdateManyMutationInput, FenologiaEtapaUncheckedUpdateManyInput>
    /**
     * Filter which FenologiaEtapas to update
     */
    where?: FenologiaEtapaWhereInput
    /**
     * Limit how many FenologiaEtapas to update.
     */
    limit?: number
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaIncludeUpdateManyAndReturn<ExtArgs> | null
  }

  /**
   * FenologiaEtapa upsert
   */
  export type FenologiaEtapaUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaInclude<ExtArgs> | null
    /**
     * The filter to search for the FenologiaEtapa to update in case it exists.
     */
    where: FenologiaEtapaWhereUniqueInput
    /**
     * In case the FenologiaEtapa found by the `where` argument doesn't exist, create a new FenologiaEtapa with this data.
     */
    create: XOR<FenologiaEtapaCreateInput, FenologiaEtapaUncheckedCreateInput>
    /**
     * In case the FenologiaEtapa was found with the provided `where` argument, update it with this data.
     */
    update: XOR<FenologiaEtapaUpdateInput, FenologiaEtapaUncheckedUpdateInput>
  }

  /**
   * FenologiaEtapa delete
   */
  export type FenologiaEtapaDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaInclude<ExtArgs> | null
    /**
     * Filter which FenologiaEtapa to delete.
     */
    where: FenologiaEtapaWhereUniqueInput
  }

  /**
   * FenologiaEtapa deleteMany
   */
  export type FenologiaEtapaDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which FenologiaEtapas to delete
     */
    where?: FenologiaEtapaWhereInput
    /**
     * Limit how many FenologiaEtapas to delete.
     */
    limit?: number
  }

  /**
   * FenologiaEtapa without action
   */
  export type FenologiaEtapaDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the FenologiaEtapa
     */
    select?: FenologiaEtapaSelect<ExtArgs> | null
    /**
     * Omit specific fields from the FenologiaEtapa
     */
    omit?: FenologiaEtapaOmit<ExtArgs> | null
    /**
     * Choose, which related nodes to fetch as well
     */
    include?: FenologiaEtapaInclude<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const UserScalarFieldEnum: {
    id: 'id',
    email: 'email',
    passwordHash: 'passwordHash',
    role: 'role',
    fcmToken: 'fcmToken',
    firstName: 'firstName',
    lastName: 'lastName',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type UserScalarFieldEnum = (typeof UserScalarFieldEnum)[keyof typeof UserScalarFieldEnum]


  export const CampoScalarFieldEnum: {
    id: 'id',
    codigoCampo: 'codigoCampo',
    nombre: 'nombre',
    productorId: 'productorId',
    poligonoGps: 'poligonoGps',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type CampoScalarFieldEnum = (typeof CampoScalarFieldEnum)[keyof typeof CampoScalarFieldEnum]


  export const UserCampoScalarFieldEnum: {
    userId: 'userId',
    campoId: 'campoId'
  };

  export type UserCampoScalarFieldEnum = (typeof UserCampoScalarFieldEnum)[keyof typeof UserCampoScalarFieldEnum]


  export const SolicitudMuestreoScalarFieldEnum: {
    id: 'id',
    creadoPorId: 'creadoPorId',
    asignadoAId: 'asignadoAId',
    campoId: 'campoId',
    mensaje: 'mensaje',
    estado: 'estado',
    fechaLimite: 'fechaLimite',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type SolicitudMuestreoScalarFieldEnum = (typeof SolicitudMuestreoScalarFieldEnum)[keyof typeof SolicitudMuestreoScalarFieldEnum]


  export const AnalysisScalarFieldEnum: {
    id: 'id',
    imageId: 'imageId',
    storageKey: 'storageKey',
    requesterUserId: 'requesterUserId',
    requesterEmail: 'requesterEmail',
    variedad: 'variedad',
    fechaAnalisis: 'fechaAnalisis',
    totalElementosDetectados: 'totalElementosDetectados',
    elementosSanos: 'elementosSanos',
    elementosEnfermos: 'elementosEnfermos',
    porcentajeMermaGeneral: 'porcentajeMermaGeneral',
    pesoSanoGramos: 'pesoSanoGramos',
    ubicacionLat: 'ubicacionLat',
    ubicacionLng: 'ubicacionLng',
    campoId: 'campoId',
    productorId: 'productorId',
    offlineSyncId: 'offlineSyncId',
    validacionEstado: 'validacionEstado',
    validacionFueCorregido: 'validacionFueCorregido',
    validacionCorregidoPorId: 'validacionCorregidoPorId',
    validacionDiagnosticoOriginal: 'validacionDiagnosticoOriginal',
    validacionCronogramaCorregido: 'validacionCronogramaCorregido',
    validacionObservaciones: 'validacionObservaciones',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  };

  export type AnalysisScalarFieldEnum = (typeof AnalysisScalarFieldEnum)[keyof typeof AnalysisScalarFieldEnum]


  export const FenologiaEtapaScalarFieldEnum: {
    id: 'id',
    analysisId: 'analysisId',
    etapa: 'etapa',
    cantidad: 'cantidad',
    cambiaA: 'cambiaA',
    enDias: 'enDias',
    diasParaCosecha: 'diasParaCosecha'
  };

  export type FenologiaEtapaScalarFieldEnum = (typeof FenologiaEtapaScalarFieldEnum)[keyof typeof FenologiaEtapaScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullableJsonNullValueInput: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull
  };

  export type NullableJsonNullValueInput = (typeof NullableJsonNullValueInput)[keyof typeof NullableJsonNullValueInput]


  export const QueryMode: {
    default: 'default',
    insensitive: 'insensitive'
  };

  export type QueryMode = (typeof QueryMode)[keyof typeof QueryMode]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  export const JsonNullValueFilter: {
    DbNull: typeof DbNull,
    JsonNull: typeof JsonNull,
    AnyNull: typeof AnyNull
  };

  export type JsonNullValueFilter = (typeof JsonNullValueFilter)[keyof typeof JsonNullValueFilter]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'String[]'
   */
  export type ListStringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String[]'>
    


  /**
   * Reference to a field of type 'Role'
   */
  export type EnumRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Role'>
    


  /**
   * Reference to a field of type 'Role[]'
   */
  export type ListEnumRoleFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Role[]'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'DateTime[]'
   */
  export type ListDateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime[]'>
    


  /**
   * Reference to a field of type 'Json'
   */
  export type JsonFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Json'>
    


  /**
   * Reference to a field of type 'QueryMode'
   */
  export type EnumQueryModeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'QueryMode'>
    


  /**
   * Reference to a field of type 'EstadoSolicitud'
   */
  export type EnumEstadoSolicitudFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoSolicitud'>
    


  /**
   * Reference to a field of type 'EstadoSolicitud[]'
   */
  export type ListEnumEstadoSolicitudFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoSolicitud[]'>
    


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'Int[]'
   */
  export type ListIntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int[]'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    


  /**
   * Reference to a field of type 'Float[]'
   */
  export type ListFloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float[]'>
    


  /**
   * Reference to a field of type 'EstadoValidacion'
   */
  export type EnumEstadoValidacionFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoValidacion'>
    


  /**
   * Reference to a field of type 'EstadoValidacion[]'
   */
  export type ListEnumEstadoValidacionFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'EstadoValidacion[]'>
    


  /**
   * Reference to a field of type 'Boolean'
   */
  export type BooleanFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Boolean'>
    
  /**
   * Deep Input Types
   */


  export type UserWhereInput = {
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    id?: UuidFilter<"User"> | string
    email?: StringFilter<"User"> | string
    passwordHash?: StringFilter<"User"> | string
    role?: EnumRoleFilter<"User"> | $Enums.Role
    fcmToken?: StringNullableFilter<"User"> | string | null
    firstName?: StringNullableFilter<"User"> | string | null
    lastName?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    camposAsignados?: UserCampoListRelationFilter
    camposProductor?: CampoListRelationFilter
    solicitudesCreadas?: SolicitudMuestreoListRelationFilter
    solicitudesAsignadas?: SolicitudMuestreoListRelationFilter
    analysesAsRequester?: AnalysisListRelationFilter
    analysesAsProductor?: AnalysisListRelationFilter
    analysesValidadas?: AnalysisListRelationFilter
  }

  export type UserOrderByWithRelationInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    role?: SortOrder
    fcmToken?: SortOrderInput | SortOrder
    firstName?: SortOrderInput | SortOrder
    lastName?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    camposAsignados?: UserCampoOrderByRelationAggregateInput
    camposProductor?: CampoOrderByRelationAggregateInput
    solicitudesCreadas?: SolicitudMuestreoOrderByRelationAggregateInput
    solicitudesAsignadas?: SolicitudMuestreoOrderByRelationAggregateInput
    analysesAsRequester?: AnalysisOrderByRelationAggregateInput
    analysesAsProductor?: AnalysisOrderByRelationAggregateInput
    analysesValidadas?: AnalysisOrderByRelationAggregateInput
  }

  export type UserWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    email?: string
    AND?: UserWhereInput | UserWhereInput[]
    OR?: UserWhereInput[]
    NOT?: UserWhereInput | UserWhereInput[]
    passwordHash?: StringFilter<"User"> | string
    role?: EnumRoleFilter<"User"> | $Enums.Role
    fcmToken?: StringNullableFilter<"User"> | string | null
    firstName?: StringNullableFilter<"User"> | string | null
    lastName?: StringNullableFilter<"User"> | string | null
    createdAt?: DateTimeFilter<"User"> | Date | string
    updatedAt?: DateTimeFilter<"User"> | Date | string
    camposAsignados?: UserCampoListRelationFilter
    camposProductor?: CampoListRelationFilter
    solicitudesCreadas?: SolicitudMuestreoListRelationFilter
    solicitudesAsignadas?: SolicitudMuestreoListRelationFilter
    analysesAsRequester?: AnalysisListRelationFilter
    analysesAsProductor?: AnalysisListRelationFilter
    analysesValidadas?: AnalysisListRelationFilter
  }, "id" | "email">

  export type UserOrderByWithAggregationInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    role?: SortOrder
    fcmToken?: SortOrderInput | SortOrder
    firstName?: SortOrderInput | SortOrder
    lastName?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: UserCountOrderByAggregateInput
    _max?: UserMaxOrderByAggregateInput
    _min?: UserMinOrderByAggregateInput
  }

  export type UserScalarWhereWithAggregatesInput = {
    AND?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    OR?: UserScalarWhereWithAggregatesInput[]
    NOT?: UserScalarWhereWithAggregatesInput | UserScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"User"> | string
    email?: StringWithAggregatesFilter<"User"> | string
    passwordHash?: StringWithAggregatesFilter<"User"> | string
    role?: EnumRoleWithAggregatesFilter<"User"> | $Enums.Role
    fcmToken?: StringNullableWithAggregatesFilter<"User"> | string | null
    firstName?: StringNullableWithAggregatesFilter<"User"> | string | null
    lastName?: StringNullableWithAggregatesFilter<"User"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"User"> | Date | string
  }

  export type CampoWhereInput = {
    AND?: CampoWhereInput | CampoWhereInput[]
    OR?: CampoWhereInput[]
    NOT?: CampoWhereInput | CampoWhereInput[]
    id?: UuidFilter<"Campo"> | string
    codigoCampo?: StringFilter<"Campo"> | string
    nombre?: StringFilter<"Campo"> | string
    productorId?: UuidFilter<"Campo"> | string
    poligonoGps?: JsonNullableFilter<"Campo">
    createdAt?: DateTimeFilter<"Campo"> | Date | string
    updatedAt?: DateTimeFilter<"Campo"> | Date | string
    productor?: XOR<UserScalarRelationFilter, UserWhereInput>
    usuarios?: UserCampoListRelationFilter
    solicitudes?: SolicitudMuestreoListRelationFilter
    analyses?: AnalysisListRelationFilter
  }

  export type CampoOrderByWithRelationInput = {
    id?: SortOrder
    codigoCampo?: SortOrder
    nombre?: SortOrder
    productorId?: SortOrder
    poligonoGps?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    productor?: UserOrderByWithRelationInput
    usuarios?: UserCampoOrderByRelationAggregateInput
    solicitudes?: SolicitudMuestreoOrderByRelationAggregateInput
    analyses?: AnalysisOrderByRelationAggregateInput
  }

  export type CampoWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: CampoWhereInput | CampoWhereInput[]
    OR?: CampoWhereInput[]
    NOT?: CampoWhereInput | CampoWhereInput[]
    codigoCampo?: StringFilter<"Campo"> | string
    nombre?: StringFilter<"Campo"> | string
    productorId?: UuidFilter<"Campo"> | string
    poligonoGps?: JsonNullableFilter<"Campo">
    createdAt?: DateTimeFilter<"Campo"> | Date | string
    updatedAt?: DateTimeFilter<"Campo"> | Date | string
    productor?: XOR<UserScalarRelationFilter, UserWhereInput>
    usuarios?: UserCampoListRelationFilter
    solicitudes?: SolicitudMuestreoListRelationFilter
    analyses?: AnalysisListRelationFilter
  }, "id">

  export type CampoOrderByWithAggregationInput = {
    id?: SortOrder
    codigoCampo?: SortOrder
    nombre?: SortOrder
    productorId?: SortOrder
    poligonoGps?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: CampoCountOrderByAggregateInput
    _max?: CampoMaxOrderByAggregateInput
    _min?: CampoMinOrderByAggregateInput
  }

  export type CampoScalarWhereWithAggregatesInput = {
    AND?: CampoScalarWhereWithAggregatesInput | CampoScalarWhereWithAggregatesInput[]
    OR?: CampoScalarWhereWithAggregatesInput[]
    NOT?: CampoScalarWhereWithAggregatesInput | CampoScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Campo"> | string
    codigoCampo?: StringWithAggregatesFilter<"Campo"> | string
    nombre?: StringWithAggregatesFilter<"Campo"> | string
    productorId?: UuidWithAggregatesFilter<"Campo"> | string
    poligonoGps?: JsonNullableWithAggregatesFilter<"Campo">
    createdAt?: DateTimeWithAggregatesFilter<"Campo"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Campo"> | Date | string
  }

  export type UserCampoWhereInput = {
    AND?: UserCampoWhereInput | UserCampoWhereInput[]
    OR?: UserCampoWhereInput[]
    NOT?: UserCampoWhereInput | UserCampoWhereInput[]
    userId?: UuidFilter<"UserCampo"> | string
    campoId?: UuidFilter<"UserCampo"> | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    campo?: XOR<CampoScalarRelationFilter, CampoWhereInput>
  }

  export type UserCampoOrderByWithRelationInput = {
    userId?: SortOrder
    campoId?: SortOrder
    user?: UserOrderByWithRelationInput
    campo?: CampoOrderByWithRelationInput
  }

  export type UserCampoWhereUniqueInput = Prisma.AtLeast<{
    userId_campoId?: UserCampoUserIdCampoIdCompoundUniqueInput
    AND?: UserCampoWhereInput | UserCampoWhereInput[]
    OR?: UserCampoWhereInput[]
    NOT?: UserCampoWhereInput | UserCampoWhereInput[]
    userId?: UuidFilter<"UserCampo"> | string
    campoId?: UuidFilter<"UserCampo"> | string
    user?: XOR<UserScalarRelationFilter, UserWhereInput>
    campo?: XOR<CampoScalarRelationFilter, CampoWhereInput>
  }, "userId_campoId">

  export type UserCampoOrderByWithAggregationInput = {
    userId?: SortOrder
    campoId?: SortOrder
    _count?: UserCampoCountOrderByAggregateInput
    _max?: UserCampoMaxOrderByAggregateInput
    _min?: UserCampoMinOrderByAggregateInput
  }

  export type UserCampoScalarWhereWithAggregatesInput = {
    AND?: UserCampoScalarWhereWithAggregatesInput | UserCampoScalarWhereWithAggregatesInput[]
    OR?: UserCampoScalarWhereWithAggregatesInput[]
    NOT?: UserCampoScalarWhereWithAggregatesInput | UserCampoScalarWhereWithAggregatesInput[]
    userId?: UuidWithAggregatesFilter<"UserCampo"> | string
    campoId?: UuidWithAggregatesFilter<"UserCampo"> | string
  }

  export type SolicitudMuestreoWhereInput = {
    AND?: SolicitudMuestreoWhereInput | SolicitudMuestreoWhereInput[]
    OR?: SolicitudMuestreoWhereInput[]
    NOT?: SolicitudMuestreoWhereInput | SolicitudMuestreoWhereInput[]
    id?: UuidFilter<"SolicitudMuestreo"> | string
    creadoPorId?: UuidFilter<"SolicitudMuestreo"> | string
    asignadoAId?: UuidFilter<"SolicitudMuestreo"> | string
    campoId?: UuidFilter<"SolicitudMuestreo"> | string
    mensaje?: StringFilter<"SolicitudMuestreo"> | string
    estado?: EnumEstadoSolicitudFilter<"SolicitudMuestreo"> | $Enums.EstadoSolicitud
    fechaLimite?: DateTimeNullableFilter<"SolicitudMuestreo"> | Date | string | null
    createdAt?: DateTimeFilter<"SolicitudMuestreo"> | Date | string
    updatedAt?: DateTimeFilter<"SolicitudMuestreo"> | Date | string
    creadoPor?: XOR<UserScalarRelationFilter, UserWhereInput>
    asignadoA?: XOR<UserScalarRelationFilter, UserWhereInput>
    campo?: XOR<CampoScalarRelationFilter, CampoWhereInput>
  }

  export type SolicitudMuestreoOrderByWithRelationInput = {
    id?: SortOrder
    creadoPorId?: SortOrder
    asignadoAId?: SortOrder
    campoId?: SortOrder
    mensaje?: SortOrder
    estado?: SortOrder
    fechaLimite?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    creadoPor?: UserOrderByWithRelationInput
    asignadoA?: UserOrderByWithRelationInput
    campo?: CampoOrderByWithRelationInput
  }

  export type SolicitudMuestreoWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: SolicitudMuestreoWhereInput | SolicitudMuestreoWhereInput[]
    OR?: SolicitudMuestreoWhereInput[]
    NOT?: SolicitudMuestreoWhereInput | SolicitudMuestreoWhereInput[]
    creadoPorId?: UuidFilter<"SolicitudMuestreo"> | string
    asignadoAId?: UuidFilter<"SolicitudMuestreo"> | string
    campoId?: UuidFilter<"SolicitudMuestreo"> | string
    mensaje?: StringFilter<"SolicitudMuestreo"> | string
    estado?: EnumEstadoSolicitudFilter<"SolicitudMuestreo"> | $Enums.EstadoSolicitud
    fechaLimite?: DateTimeNullableFilter<"SolicitudMuestreo"> | Date | string | null
    createdAt?: DateTimeFilter<"SolicitudMuestreo"> | Date | string
    updatedAt?: DateTimeFilter<"SolicitudMuestreo"> | Date | string
    creadoPor?: XOR<UserScalarRelationFilter, UserWhereInput>
    asignadoA?: XOR<UserScalarRelationFilter, UserWhereInput>
    campo?: XOR<CampoScalarRelationFilter, CampoWhereInput>
  }, "id">

  export type SolicitudMuestreoOrderByWithAggregationInput = {
    id?: SortOrder
    creadoPorId?: SortOrder
    asignadoAId?: SortOrder
    campoId?: SortOrder
    mensaje?: SortOrder
    estado?: SortOrder
    fechaLimite?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: SolicitudMuestreoCountOrderByAggregateInput
    _max?: SolicitudMuestreoMaxOrderByAggregateInput
    _min?: SolicitudMuestreoMinOrderByAggregateInput
  }

  export type SolicitudMuestreoScalarWhereWithAggregatesInput = {
    AND?: SolicitudMuestreoScalarWhereWithAggregatesInput | SolicitudMuestreoScalarWhereWithAggregatesInput[]
    OR?: SolicitudMuestreoScalarWhereWithAggregatesInput[]
    NOT?: SolicitudMuestreoScalarWhereWithAggregatesInput | SolicitudMuestreoScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"SolicitudMuestreo"> | string
    creadoPorId?: UuidWithAggregatesFilter<"SolicitudMuestreo"> | string
    asignadoAId?: UuidWithAggregatesFilter<"SolicitudMuestreo"> | string
    campoId?: UuidWithAggregatesFilter<"SolicitudMuestreo"> | string
    mensaje?: StringWithAggregatesFilter<"SolicitudMuestreo"> | string
    estado?: EnumEstadoSolicitudWithAggregatesFilter<"SolicitudMuestreo"> | $Enums.EstadoSolicitud
    fechaLimite?: DateTimeNullableWithAggregatesFilter<"SolicitudMuestreo"> | Date | string | null
    createdAt?: DateTimeWithAggregatesFilter<"SolicitudMuestreo"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"SolicitudMuestreo"> | Date | string
  }

  export type AnalysisWhereInput = {
    AND?: AnalysisWhereInput | AnalysisWhereInput[]
    OR?: AnalysisWhereInput[]
    NOT?: AnalysisWhereInput | AnalysisWhereInput[]
    id?: UuidFilter<"Analysis"> | string
    imageId?: StringFilter<"Analysis"> | string
    storageKey?: StringFilter<"Analysis"> | string
    requesterUserId?: UuidFilter<"Analysis"> | string
    requesterEmail?: StringFilter<"Analysis"> | string
    variedad?: StringNullableFilter<"Analysis"> | string | null
    fechaAnalisis?: DateTimeFilter<"Analysis"> | Date | string
    totalElementosDetectados?: IntFilter<"Analysis"> | number
    elementosSanos?: IntFilter<"Analysis"> | number
    elementosEnfermos?: IntFilter<"Analysis"> | number
    porcentajeMermaGeneral?: FloatFilter<"Analysis"> | number
    pesoSanoGramos?: FloatFilter<"Analysis"> | number
    ubicacionLat?: FloatNullableFilter<"Analysis"> | number | null
    ubicacionLng?: FloatNullableFilter<"Analysis"> | number | null
    campoId?: UuidFilter<"Analysis"> | string
    productorId?: UuidFilter<"Analysis"> | string
    offlineSyncId?: StringNullableFilter<"Analysis"> | string | null
    validacionEstado?: EnumEstadoValidacionFilter<"Analysis"> | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFilter<"Analysis"> | boolean
    validacionCorregidoPorId?: UuidNullableFilter<"Analysis"> | string | null
    validacionDiagnosticoOriginal?: StringNullableFilter<"Analysis"> | string | null
    validacionCronogramaCorregido?: JsonNullableFilter<"Analysis">
    validacionObservaciones?: StringNullableFilter<"Analysis"> | string | null
    createdAt?: DateTimeFilter<"Analysis"> | Date | string
    updatedAt?: DateTimeFilter<"Analysis"> | Date | string
    requester?: XOR<UserScalarRelationFilter, UserWhereInput>
    productor?: XOR<UserScalarRelationFilter, UserWhereInput>
    campo?: XOR<CampoScalarRelationFilter, CampoWhereInput>
    validadoPor?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    fenologiaEtapas?: FenologiaEtapaListRelationFilter
  }

  export type AnalysisOrderByWithRelationInput = {
    id?: SortOrder
    imageId?: SortOrder
    storageKey?: SortOrder
    requesterUserId?: SortOrder
    requesterEmail?: SortOrder
    variedad?: SortOrderInput | SortOrder
    fechaAnalisis?: SortOrder
    totalElementosDetectados?: SortOrder
    elementosSanos?: SortOrder
    elementosEnfermos?: SortOrder
    porcentajeMermaGeneral?: SortOrder
    pesoSanoGramos?: SortOrder
    ubicacionLat?: SortOrderInput | SortOrder
    ubicacionLng?: SortOrderInput | SortOrder
    campoId?: SortOrder
    productorId?: SortOrder
    offlineSyncId?: SortOrderInput | SortOrder
    validacionEstado?: SortOrder
    validacionFueCorregido?: SortOrder
    validacionCorregidoPorId?: SortOrderInput | SortOrder
    validacionDiagnosticoOriginal?: SortOrderInput | SortOrder
    validacionCronogramaCorregido?: SortOrderInput | SortOrder
    validacionObservaciones?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    requester?: UserOrderByWithRelationInput
    productor?: UserOrderByWithRelationInput
    campo?: CampoOrderByWithRelationInput
    validadoPor?: UserOrderByWithRelationInput
    fenologiaEtapas?: FenologiaEtapaOrderByRelationAggregateInput
  }

  export type AnalysisWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    imageId?: string
    offlineSyncId?: string
    AND?: AnalysisWhereInput | AnalysisWhereInput[]
    OR?: AnalysisWhereInput[]
    NOT?: AnalysisWhereInput | AnalysisWhereInput[]
    storageKey?: StringFilter<"Analysis"> | string
    requesterUserId?: UuidFilter<"Analysis"> | string
    requesterEmail?: StringFilter<"Analysis"> | string
    variedad?: StringNullableFilter<"Analysis"> | string | null
    fechaAnalisis?: DateTimeFilter<"Analysis"> | Date | string
    totalElementosDetectados?: IntFilter<"Analysis"> | number
    elementosSanos?: IntFilter<"Analysis"> | number
    elementosEnfermos?: IntFilter<"Analysis"> | number
    porcentajeMermaGeneral?: FloatFilter<"Analysis"> | number
    pesoSanoGramos?: FloatFilter<"Analysis"> | number
    ubicacionLat?: FloatNullableFilter<"Analysis"> | number | null
    ubicacionLng?: FloatNullableFilter<"Analysis"> | number | null
    campoId?: UuidFilter<"Analysis"> | string
    productorId?: UuidFilter<"Analysis"> | string
    validacionEstado?: EnumEstadoValidacionFilter<"Analysis"> | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFilter<"Analysis"> | boolean
    validacionCorregidoPorId?: UuidNullableFilter<"Analysis"> | string | null
    validacionDiagnosticoOriginal?: StringNullableFilter<"Analysis"> | string | null
    validacionCronogramaCorregido?: JsonNullableFilter<"Analysis">
    validacionObservaciones?: StringNullableFilter<"Analysis"> | string | null
    createdAt?: DateTimeFilter<"Analysis"> | Date | string
    updatedAt?: DateTimeFilter<"Analysis"> | Date | string
    requester?: XOR<UserScalarRelationFilter, UserWhereInput>
    productor?: XOR<UserScalarRelationFilter, UserWhereInput>
    campo?: XOR<CampoScalarRelationFilter, CampoWhereInput>
    validadoPor?: XOR<UserNullableScalarRelationFilter, UserWhereInput> | null
    fenologiaEtapas?: FenologiaEtapaListRelationFilter
  }, "id" | "imageId" | "offlineSyncId">

  export type AnalysisOrderByWithAggregationInput = {
    id?: SortOrder
    imageId?: SortOrder
    storageKey?: SortOrder
    requesterUserId?: SortOrder
    requesterEmail?: SortOrder
    variedad?: SortOrderInput | SortOrder
    fechaAnalisis?: SortOrder
    totalElementosDetectados?: SortOrder
    elementosSanos?: SortOrder
    elementosEnfermos?: SortOrder
    porcentajeMermaGeneral?: SortOrder
    pesoSanoGramos?: SortOrder
    ubicacionLat?: SortOrderInput | SortOrder
    ubicacionLng?: SortOrderInput | SortOrder
    campoId?: SortOrder
    productorId?: SortOrder
    offlineSyncId?: SortOrderInput | SortOrder
    validacionEstado?: SortOrder
    validacionFueCorregido?: SortOrder
    validacionCorregidoPorId?: SortOrderInput | SortOrder
    validacionDiagnosticoOriginal?: SortOrderInput | SortOrder
    validacionCronogramaCorregido?: SortOrderInput | SortOrder
    validacionObservaciones?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
    _count?: AnalysisCountOrderByAggregateInput
    _avg?: AnalysisAvgOrderByAggregateInput
    _max?: AnalysisMaxOrderByAggregateInput
    _min?: AnalysisMinOrderByAggregateInput
    _sum?: AnalysisSumOrderByAggregateInput
  }

  export type AnalysisScalarWhereWithAggregatesInput = {
    AND?: AnalysisScalarWhereWithAggregatesInput | AnalysisScalarWhereWithAggregatesInput[]
    OR?: AnalysisScalarWhereWithAggregatesInput[]
    NOT?: AnalysisScalarWhereWithAggregatesInput | AnalysisScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"Analysis"> | string
    imageId?: StringWithAggregatesFilter<"Analysis"> | string
    storageKey?: StringWithAggregatesFilter<"Analysis"> | string
    requesterUserId?: UuidWithAggregatesFilter<"Analysis"> | string
    requesterEmail?: StringWithAggregatesFilter<"Analysis"> | string
    variedad?: StringNullableWithAggregatesFilter<"Analysis"> | string | null
    fechaAnalisis?: DateTimeWithAggregatesFilter<"Analysis"> | Date | string
    totalElementosDetectados?: IntWithAggregatesFilter<"Analysis"> | number
    elementosSanos?: IntWithAggregatesFilter<"Analysis"> | number
    elementosEnfermos?: IntWithAggregatesFilter<"Analysis"> | number
    porcentajeMermaGeneral?: FloatWithAggregatesFilter<"Analysis"> | number
    pesoSanoGramos?: FloatWithAggregatesFilter<"Analysis"> | number
    ubicacionLat?: FloatNullableWithAggregatesFilter<"Analysis"> | number | null
    ubicacionLng?: FloatNullableWithAggregatesFilter<"Analysis"> | number | null
    campoId?: UuidWithAggregatesFilter<"Analysis"> | string
    productorId?: UuidWithAggregatesFilter<"Analysis"> | string
    offlineSyncId?: StringNullableWithAggregatesFilter<"Analysis"> | string | null
    validacionEstado?: EnumEstadoValidacionWithAggregatesFilter<"Analysis"> | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolWithAggregatesFilter<"Analysis"> | boolean
    validacionCorregidoPorId?: UuidNullableWithAggregatesFilter<"Analysis"> | string | null
    validacionDiagnosticoOriginal?: StringNullableWithAggregatesFilter<"Analysis"> | string | null
    validacionCronogramaCorregido?: JsonNullableWithAggregatesFilter<"Analysis">
    validacionObservaciones?: StringNullableWithAggregatesFilter<"Analysis"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"Analysis"> | Date | string
    updatedAt?: DateTimeWithAggregatesFilter<"Analysis"> | Date | string
  }

  export type FenologiaEtapaWhereInput = {
    AND?: FenologiaEtapaWhereInput | FenologiaEtapaWhereInput[]
    OR?: FenologiaEtapaWhereInput[]
    NOT?: FenologiaEtapaWhereInput | FenologiaEtapaWhereInput[]
    id?: UuidFilter<"FenologiaEtapa"> | string
    analysisId?: UuidFilter<"FenologiaEtapa"> | string
    etapa?: StringFilter<"FenologiaEtapa"> | string
    cantidad?: IntFilter<"FenologiaEtapa"> | number
    cambiaA?: StringFilter<"FenologiaEtapa"> | string
    enDias?: IntFilter<"FenologiaEtapa"> | number
    diasParaCosecha?: IntFilter<"FenologiaEtapa"> | number
    analysis?: XOR<AnalysisScalarRelationFilter, AnalysisWhereInput>
  }

  export type FenologiaEtapaOrderByWithRelationInput = {
    id?: SortOrder
    analysisId?: SortOrder
    etapa?: SortOrder
    cantidad?: SortOrder
    cambiaA?: SortOrder
    enDias?: SortOrder
    diasParaCosecha?: SortOrder
    analysis?: AnalysisOrderByWithRelationInput
  }

  export type FenologiaEtapaWhereUniqueInput = Prisma.AtLeast<{
    id?: string
    AND?: FenologiaEtapaWhereInput | FenologiaEtapaWhereInput[]
    OR?: FenologiaEtapaWhereInput[]
    NOT?: FenologiaEtapaWhereInput | FenologiaEtapaWhereInput[]
    analysisId?: UuidFilter<"FenologiaEtapa"> | string
    etapa?: StringFilter<"FenologiaEtapa"> | string
    cantidad?: IntFilter<"FenologiaEtapa"> | number
    cambiaA?: StringFilter<"FenologiaEtapa"> | string
    enDias?: IntFilter<"FenologiaEtapa"> | number
    diasParaCosecha?: IntFilter<"FenologiaEtapa"> | number
    analysis?: XOR<AnalysisScalarRelationFilter, AnalysisWhereInput>
  }, "id">

  export type FenologiaEtapaOrderByWithAggregationInput = {
    id?: SortOrder
    analysisId?: SortOrder
    etapa?: SortOrder
    cantidad?: SortOrder
    cambiaA?: SortOrder
    enDias?: SortOrder
    diasParaCosecha?: SortOrder
    _count?: FenologiaEtapaCountOrderByAggregateInput
    _avg?: FenologiaEtapaAvgOrderByAggregateInput
    _max?: FenologiaEtapaMaxOrderByAggregateInput
    _min?: FenologiaEtapaMinOrderByAggregateInput
    _sum?: FenologiaEtapaSumOrderByAggregateInput
  }

  export type FenologiaEtapaScalarWhereWithAggregatesInput = {
    AND?: FenologiaEtapaScalarWhereWithAggregatesInput | FenologiaEtapaScalarWhereWithAggregatesInput[]
    OR?: FenologiaEtapaScalarWhereWithAggregatesInput[]
    NOT?: FenologiaEtapaScalarWhereWithAggregatesInput | FenologiaEtapaScalarWhereWithAggregatesInput[]
    id?: UuidWithAggregatesFilter<"FenologiaEtapa"> | string
    analysisId?: UuidWithAggregatesFilter<"FenologiaEtapa"> | string
    etapa?: StringWithAggregatesFilter<"FenologiaEtapa"> | string
    cantidad?: IntWithAggregatesFilter<"FenologiaEtapa"> | number
    cambiaA?: StringWithAggregatesFilter<"FenologiaEtapa"> | string
    enDias?: IntWithAggregatesFilter<"FenologiaEtapa"> | number
    diasParaCosecha?: IntWithAggregatesFilter<"FenologiaEtapa"> | number
  }

  export type UserCreateInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoCreateNestedManyWithoutUserInput
    camposProductor?: CampoCreateNestedManyWithoutProductorInput
    solicitudesCreadas?: SolicitudMuestreoCreateNestedManyWithoutCreadoPorInput
    solicitudesAsignadas?: SolicitudMuestreoCreateNestedManyWithoutAsignadoAInput
    analysesAsRequester?: AnalysisCreateNestedManyWithoutRequesterInput
    analysesAsProductor?: AnalysisCreateNestedManyWithoutProductorInput
    analysesValidadas?: AnalysisCreateNestedManyWithoutValidadoPorInput
  }

  export type UserUncheckedCreateInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoUncheckedCreateNestedManyWithoutUserInput
    camposProductor?: CampoUncheckedCreateNestedManyWithoutProductorInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutCreadoPorInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutAsignadoAInput
    analysesAsRequester?: AnalysisUncheckedCreateNestedManyWithoutRequesterInput
    analysesAsProductor?: AnalysisUncheckedCreateNestedManyWithoutProductorInput
    analysesValidadas?: AnalysisUncheckedCreateNestedManyWithoutValidadoPorInput
  }

  export type UserUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUpdateManyWithoutUserNestedInput
    camposProductor?: CampoUpdateManyWithoutProductorNestedInput
    solicitudesCreadas?: SolicitudMuestreoUpdateManyWithoutCreadoPorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUpdateManyWithoutAsignadoANestedInput
    analysesAsRequester?: AnalysisUpdateManyWithoutRequesterNestedInput
    analysesAsProductor?: AnalysisUpdateManyWithoutProductorNestedInput
    analysesValidadas?: AnalysisUpdateManyWithoutValidadoPorNestedInput
  }

  export type UserUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUncheckedUpdateManyWithoutUserNestedInput
    camposProductor?: CampoUncheckedUpdateManyWithoutProductorNestedInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedUpdateManyWithoutCreadoPorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedUpdateManyWithoutAsignadoANestedInput
    analysesAsRequester?: AnalysisUncheckedUpdateManyWithoutRequesterNestedInput
    analysesAsProductor?: AnalysisUncheckedUpdateManyWithoutProductorNestedInput
    analysesValidadas?: AnalysisUncheckedUpdateManyWithoutValidadoPorNestedInput
  }

  export type UserCreateManyInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CampoCreateInput = {
    id?: string
    codigoCampo: string
    nombre: string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    productor: UserCreateNestedOneWithoutCamposProductorInput
    usuarios?: UserCampoCreateNestedManyWithoutCampoInput
    solicitudes?: SolicitudMuestreoCreateNestedManyWithoutCampoInput
    analyses?: AnalysisCreateNestedManyWithoutCampoInput
  }

  export type CampoUncheckedCreateInput = {
    id?: string
    codigoCampo: string
    nombre: string
    productorId: string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    usuarios?: UserCampoUncheckedCreateNestedManyWithoutCampoInput
    solicitudes?: SolicitudMuestreoUncheckedCreateNestedManyWithoutCampoInput
    analyses?: AnalysisUncheckedCreateNestedManyWithoutCampoInput
  }

  export type CampoUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    productor?: UserUpdateOneRequiredWithoutCamposProductorNestedInput
    usuarios?: UserCampoUpdateManyWithoutCampoNestedInput
    solicitudes?: SolicitudMuestreoUpdateManyWithoutCampoNestedInput
    analyses?: AnalysisUpdateManyWithoutCampoNestedInput
  }

  export type CampoUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    productorId?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UserCampoUncheckedUpdateManyWithoutCampoNestedInput
    solicitudes?: SolicitudMuestreoUncheckedUpdateManyWithoutCampoNestedInput
    analyses?: AnalysisUncheckedUpdateManyWithoutCampoNestedInput
  }

  export type CampoCreateManyInput = {
    id?: string
    codigoCampo: string
    nombre: string
    productorId: string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type CampoUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type CampoUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    productorId?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCampoCreateInput = {
    user: UserCreateNestedOneWithoutCamposAsignadosInput
    campo: CampoCreateNestedOneWithoutUsuariosInput
  }

  export type UserCampoUncheckedCreateInput = {
    userId: string
    campoId: string
  }

  export type UserCampoUpdateInput = {
    user?: UserUpdateOneRequiredWithoutCamposAsignadosNestedInput
    campo?: CampoUpdateOneRequiredWithoutUsuariosNestedInput
  }

  export type UserCampoUncheckedUpdateInput = {
    userId?: StringFieldUpdateOperationsInput | string
    campoId?: StringFieldUpdateOperationsInput | string
  }

  export type UserCampoCreateManyInput = {
    userId: string
    campoId: string
  }

  export type UserCampoUpdateManyMutationInput = {

  }

  export type UserCampoUncheckedUpdateManyInput = {
    userId?: StringFieldUpdateOperationsInput | string
    campoId?: StringFieldUpdateOperationsInput | string
  }

  export type SolicitudMuestreoCreateInput = {
    id?: string
    mensaje: string
    estado?: $Enums.EstadoSolicitud
    fechaLimite?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    creadoPor: UserCreateNestedOneWithoutSolicitudesCreadasInput
    asignadoA: UserCreateNestedOneWithoutSolicitudesAsignadasInput
    campo: CampoCreateNestedOneWithoutSolicitudesInput
  }

  export type SolicitudMuestreoUncheckedCreateInput = {
    id?: string
    creadoPorId: string
    asignadoAId: string
    campoId: string
    mensaje: string
    estado?: $Enums.EstadoSolicitud
    fechaLimite?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SolicitudMuestreoUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    creadoPor?: UserUpdateOneRequiredWithoutSolicitudesCreadasNestedInput
    asignadoA?: UserUpdateOneRequiredWithoutSolicitudesAsignadasNestedInput
    campo?: CampoUpdateOneRequiredWithoutSolicitudesNestedInput
  }

  export type SolicitudMuestreoUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    creadoPorId?: StringFieldUpdateOperationsInput | string
    asignadoAId?: StringFieldUpdateOperationsInput | string
    campoId?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SolicitudMuestreoCreateManyInput = {
    id?: string
    creadoPorId: string
    asignadoAId: string
    campoId: string
    mensaje: string
    estado?: $Enums.EstadoSolicitud
    fechaLimite?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SolicitudMuestreoUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SolicitudMuestreoUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    creadoPorId?: StringFieldUpdateOperationsInput | string
    asignadoAId?: StringFieldUpdateOperationsInput | string
    campoId?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AnalysisCreateInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    requester: UserCreateNestedOneWithoutAnalysesAsRequesterInput
    productor: UserCreateNestedOneWithoutAnalysesAsProductorInput
    campo: CampoCreateNestedOneWithoutAnalysesInput
    validadoPor?: UserCreateNestedOneWithoutAnalysesValidadasInput
    fenologiaEtapas?: FenologiaEtapaCreateNestedManyWithoutAnalysisInput
  }

  export type AnalysisUncheckedCreateInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterUserId: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    campoId: string
    productorId: string
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: string | null
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    fenologiaEtapas?: FenologiaEtapaUncheckedCreateNestedManyWithoutAnalysisInput
  }

  export type AnalysisUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    requester?: UserUpdateOneRequiredWithoutAnalysesAsRequesterNestedInput
    productor?: UserUpdateOneRequiredWithoutAnalysesAsProductorNestedInput
    campo?: CampoUpdateOneRequiredWithoutAnalysesNestedInput
    validadoPor?: UserUpdateOneWithoutAnalysesValidadasNestedInput
    fenologiaEtapas?: FenologiaEtapaUpdateManyWithoutAnalysisNestedInput
  }

  export type AnalysisUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterUserId?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    campoId?: StringFieldUpdateOperationsInput | string
    productorId?: StringFieldUpdateOperationsInput | string
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionCorregidoPorId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    fenologiaEtapas?: FenologiaEtapaUncheckedUpdateManyWithoutAnalysisNestedInput
  }

  export type AnalysisCreateManyInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterUserId: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    campoId: string
    productorId: string
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: string | null
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AnalysisUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AnalysisUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterUserId?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    campoId?: StringFieldUpdateOperationsInput | string
    productorId?: StringFieldUpdateOperationsInput | string
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionCorregidoPorId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FenologiaEtapaCreateInput = {
    id?: string
    etapa: string
    cantidad: number
    cambiaA: string
    enDias: number
    diasParaCosecha: number
    analysis: AnalysisCreateNestedOneWithoutFenologiaEtapasInput
  }

  export type FenologiaEtapaUncheckedCreateInput = {
    id?: string
    analysisId: string
    etapa: string
    cantidad: number
    cambiaA: string
    enDias: number
    diasParaCosecha: number
  }

  export type FenologiaEtapaUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    etapa?: StringFieldUpdateOperationsInput | string
    cantidad?: IntFieldUpdateOperationsInput | number
    cambiaA?: StringFieldUpdateOperationsInput | string
    enDias?: IntFieldUpdateOperationsInput | number
    diasParaCosecha?: IntFieldUpdateOperationsInput | number
    analysis?: AnalysisUpdateOneRequiredWithoutFenologiaEtapasNestedInput
  }

  export type FenologiaEtapaUncheckedUpdateInput = {
    id?: StringFieldUpdateOperationsInput | string
    analysisId?: StringFieldUpdateOperationsInput | string
    etapa?: StringFieldUpdateOperationsInput | string
    cantidad?: IntFieldUpdateOperationsInput | number
    cambiaA?: StringFieldUpdateOperationsInput | string
    enDias?: IntFieldUpdateOperationsInput | number
    diasParaCosecha?: IntFieldUpdateOperationsInput | number
  }

  export type FenologiaEtapaCreateManyInput = {
    id?: string
    analysisId: string
    etapa: string
    cantidad: number
    cambiaA: string
    enDias: number
    diasParaCosecha: number
  }

  export type FenologiaEtapaUpdateManyMutationInput = {
    id?: StringFieldUpdateOperationsInput | string
    etapa?: StringFieldUpdateOperationsInput | string
    cantidad?: IntFieldUpdateOperationsInput | number
    cambiaA?: StringFieldUpdateOperationsInput | string
    enDias?: IntFieldUpdateOperationsInput | number
    diasParaCosecha?: IntFieldUpdateOperationsInput | number
  }

  export type FenologiaEtapaUncheckedUpdateManyInput = {
    id?: StringFieldUpdateOperationsInput | string
    analysisId?: StringFieldUpdateOperationsInput | string
    etapa?: StringFieldUpdateOperationsInput | string
    cantidad?: IntFieldUpdateOperationsInput | number
    cambiaA?: StringFieldUpdateOperationsInput | string
    enDias?: IntFieldUpdateOperationsInput | number
    diasParaCosecha?: IntFieldUpdateOperationsInput | number
  }

  export type UuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type EnumRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.Role | EnumRoleFieldRefInput<$PrismaModel>
    in?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumRoleFilter<$PrismaModel> | $Enums.Role
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type UserCampoListRelationFilter = {
    every?: UserCampoWhereInput
    some?: UserCampoWhereInput
    none?: UserCampoWhereInput
  }

  export type CampoListRelationFilter = {
    every?: CampoWhereInput
    some?: CampoWhereInput
    none?: CampoWhereInput
  }

  export type SolicitudMuestreoListRelationFilter = {
    every?: SolicitudMuestreoWhereInput
    some?: SolicitudMuestreoWhereInput
    none?: SolicitudMuestreoWhereInput
  }

  export type AnalysisListRelationFilter = {
    every?: AnalysisWhereInput
    some?: AnalysisWhereInput
    none?: AnalysisWhereInput
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type UserCampoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type CampoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type SolicitudMuestreoOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AnalysisOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type UserCountOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    role?: SortOrder
    fcmToken?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMaxOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    role?: SortOrder
    fcmToken?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UserMinOrderByAggregateInput = {
    id?: SortOrder
    email?: SortOrder
    passwordHash?: SortOrder
    role?: SortOrder
    fcmToken?: SortOrder
    firstName?: SortOrder
    lastName?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type UuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type EnumRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Role | EnumRoleFieldRefInput<$PrismaModel>
    in?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumRoleWithAggregatesFilter<$PrismaModel> | $Enums.Role
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRoleFilter<$PrismaModel>
    _max?: NestedEnumRoleFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type JsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type UserScalarRelationFilter = {
    is?: UserWhereInput
    isNot?: UserWhereInput
  }

  export type CampoCountOrderByAggregateInput = {
    id?: SortOrder
    codigoCampo?: SortOrder
    nombre?: SortOrder
    productorId?: SortOrder
    poligonoGps?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CampoMaxOrderByAggregateInput = {
    id?: SortOrder
    codigoCampo?: SortOrder
    nombre?: SortOrder
    productorId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type CampoMinOrderByAggregateInput = {
    id?: SortOrder
    codigoCampo?: SortOrder
    nombre?: SortOrder
    productorId?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }
  export type JsonNullableWithAggregatesFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, Exclude<keyof Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>,
        Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<JsonNullableWithAggregatesFilterBase<$PrismaModel>>, 'path'>>

  export type JsonNullableWithAggregatesFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedJsonNullableFilter<$PrismaModel>
    _max?: NestedJsonNullableFilter<$PrismaModel>
  }

  export type CampoScalarRelationFilter = {
    is?: CampoWhereInput
    isNot?: CampoWhereInput
  }

  export type UserCampoUserIdCampoIdCompoundUniqueInput = {
    userId: string
    campoId: string
  }

  export type UserCampoCountOrderByAggregateInput = {
    userId?: SortOrder
    campoId?: SortOrder
  }

  export type UserCampoMaxOrderByAggregateInput = {
    userId?: SortOrder
    campoId?: SortOrder
  }

  export type UserCampoMinOrderByAggregateInput = {
    userId?: SortOrder
    campoId?: SortOrder
  }

  export type EnumEstadoSolicitudFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoSolicitud | EnumEstadoSolicitudFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoSolicitud[] | ListEnumEstadoSolicitudFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoSolicitud[] | ListEnumEstadoSolicitudFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoSolicitudFilter<$PrismaModel> | $Enums.EstadoSolicitud
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type SolicitudMuestreoCountOrderByAggregateInput = {
    id?: SortOrder
    creadoPorId?: SortOrder
    asignadoAId?: SortOrder
    campoId?: SortOrder
    mensaje?: SortOrder
    estado?: SortOrder
    fechaLimite?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SolicitudMuestreoMaxOrderByAggregateInput = {
    id?: SortOrder
    creadoPorId?: SortOrder
    asignadoAId?: SortOrder
    campoId?: SortOrder
    mensaje?: SortOrder
    estado?: SortOrder
    fechaLimite?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type SolicitudMuestreoMinOrderByAggregateInput = {
    id?: SortOrder
    creadoPorId?: SortOrder
    asignadoAId?: SortOrder
    campoId?: SortOrder
    mensaje?: SortOrder
    estado?: SortOrder
    fechaLimite?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type EnumEstadoSolicitudWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoSolicitud | EnumEstadoSolicitudFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoSolicitud[] | ListEnumEstadoSolicitudFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoSolicitud[] | ListEnumEstadoSolicitudFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoSolicitudWithAggregatesFilter<$PrismaModel> | $Enums.EstadoSolicitud
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoSolicitudFilter<$PrismaModel>
    _max?: NestedEnumEstadoSolicitudFilter<$PrismaModel>
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type FloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type FloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type EnumEstadoValidacionFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoValidacion | EnumEstadoValidacionFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoValidacion[] | ListEnumEstadoValidacionFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoValidacion[] | ListEnumEstadoValidacionFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoValidacionFilter<$PrismaModel> | $Enums.EstadoValidacion
  }

  export type BoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type UuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type UserNullableScalarRelationFilter = {
    is?: UserWhereInput | null
    isNot?: UserWhereInput | null
  }

  export type FenologiaEtapaListRelationFilter = {
    every?: FenologiaEtapaWhereInput
    some?: FenologiaEtapaWhereInput
    none?: FenologiaEtapaWhereInput
  }

  export type FenologiaEtapaOrderByRelationAggregateInput = {
    _count?: SortOrder
  }

  export type AnalysisCountOrderByAggregateInput = {
    id?: SortOrder
    imageId?: SortOrder
    storageKey?: SortOrder
    requesterUserId?: SortOrder
    requesterEmail?: SortOrder
    variedad?: SortOrder
    fechaAnalisis?: SortOrder
    totalElementosDetectados?: SortOrder
    elementosSanos?: SortOrder
    elementosEnfermos?: SortOrder
    porcentajeMermaGeneral?: SortOrder
    pesoSanoGramos?: SortOrder
    ubicacionLat?: SortOrder
    ubicacionLng?: SortOrder
    campoId?: SortOrder
    productorId?: SortOrder
    offlineSyncId?: SortOrder
    validacionEstado?: SortOrder
    validacionFueCorregido?: SortOrder
    validacionCorregidoPorId?: SortOrder
    validacionDiagnosticoOriginal?: SortOrder
    validacionCronogramaCorregido?: SortOrder
    validacionObservaciones?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AnalysisAvgOrderByAggregateInput = {
    totalElementosDetectados?: SortOrder
    elementosSanos?: SortOrder
    elementosEnfermos?: SortOrder
    porcentajeMermaGeneral?: SortOrder
    pesoSanoGramos?: SortOrder
    ubicacionLat?: SortOrder
    ubicacionLng?: SortOrder
  }

  export type AnalysisMaxOrderByAggregateInput = {
    id?: SortOrder
    imageId?: SortOrder
    storageKey?: SortOrder
    requesterUserId?: SortOrder
    requesterEmail?: SortOrder
    variedad?: SortOrder
    fechaAnalisis?: SortOrder
    totalElementosDetectados?: SortOrder
    elementosSanos?: SortOrder
    elementosEnfermos?: SortOrder
    porcentajeMermaGeneral?: SortOrder
    pesoSanoGramos?: SortOrder
    ubicacionLat?: SortOrder
    ubicacionLng?: SortOrder
    campoId?: SortOrder
    productorId?: SortOrder
    offlineSyncId?: SortOrder
    validacionEstado?: SortOrder
    validacionFueCorregido?: SortOrder
    validacionCorregidoPorId?: SortOrder
    validacionDiagnosticoOriginal?: SortOrder
    validacionObservaciones?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AnalysisMinOrderByAggregateInput = {
    id?: SortOrder
    imageId?: SortOrder
    storageKey?: SortOrder
    requesterUserId?: SortOrder
    requesterEmail?: SortOrder
    variedad?: SortOrder
    fechaAnalisis?: SortOrder
    totalElementosDetectados?: SortOrder
    elementosSanos?: SortOrder
    elementosEnfermos?: SortOrder
    porcentajeMermaGeneral?: SortOrder
    pesoSanoGramos?: SortOrder
    ubicacionLat?: SortOrder
    ubicacionLng?: SortOrder
    campoId?: SortOrder
    productorId?: SortOrder
    offlineSyncId?: SortOrder
    validacionEstado?: SortOrder
    validacionFueCorregido?: SortOrder
    validacionCorregidoPorId?: SortOrder
    validacionDiagnosticoOriginal?: SortOrder
    validacionObservaciones?: SortOrder
    createdAt?: SortOrder
    updatedAt?: SortOrder
  }

  export type AnalysisSumOrderByAggregateInput = {
    totalElementosDetectados?: SortOrder
    elementosSanos?: SortOrder
    elementosEnfermos?: SortOrder
    porcentajeMermaGeneral?: SortOrder
    pesoSanoGramos?: SortOrder
    ubicacionLat?: SortOrder
    ubicacionLng?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type FloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type FloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type EnumEstadoValidacionWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoValidacion | EnumEstadoValidacionFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoValidacion[] | ListEnumEstadoValidacionFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoValidacion[] | ListEnumEstadoValidacionFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoValidacionWithAggregatesFilter<$PrismaModel> | $Enums.EstadoValidacion
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoValidacionFilter<$PrismaModel>
    _max?: NestedEnumEstadoValidacionFilter<$PrismaModel>
  }

  export type BoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type UuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    mode?: QueryMode
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type AnalysisScalarRelationFilter = {
    is?: AnalysisWhereInput
    isNot?: AnalysisWhereInput
  }

  export type FenologiaEtapaCountOrderByAggregateInput = {
    id?: SortOrder
    analysisId?: SortOrder
    etapa?: SortOrder
    cantidad?: SortOrder
    cambiaA?: SortOrder
    enDias?: SortOrder
    diasParaCosecha?: SortOrder
  }

  export type FenologiaEtapaAvgOrderByAggregateInput = {
    cantidad?: SortOrder
    enDias?: SortOrder
    diasParaCosecha?: SortOrder
  }

  export type FenologiaEtapaMaxOrderByAggregateInput = {
    id?: SortOrder
    analysisId?: SortOrder
    etapa?: SortOrder
    cantidad?: SortOrder
    cambiaA?: SortOrder
    enDias?: SortOrder
    diasParaCosecha?: SortOrder
  }

  export type FenologiaEtapaMinOrderByAggregateInput = {
    id?: SortOrder
    analysisId?: SortOrder
    etapa?: SortOrder
    cantidad?: SortOrder
    cambiaA?: SortOrder
    enDias?: SortOrder
    diasParaCosecha?: SortOrder
  }

  export type FenologiaEtapaSumOrderByAggregateInput = {
    cantidad?: SortOrder
    enDias?: SortOrder
    diasParaCosecha?: SortOrder
  }

  export type UserCampoCreateNestedManyWithoutUserInput = {
    create?: XOR<UserCampoCreateWithoutUserInput, UserCampoUncheckedCreateWithoutUserInput> | UserCampoCreateWithoutUserInput[] | UserCampoUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserCampoCreateOrConnectWithoutUserInput | UserCampoCreateOrConnectWithoutUserInput[]
    createMany?: UserCampoCreateManyUserInputEnvelope
    connect?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
  }

  export type CampoCreateNestedManyWithoutProductorInput = {
    create?: XOR<CampoCreateWithoutProductorInput, CampoUncheckedCreateWithoutProductorInput> | CampoCreateWithoutProductorInput[] | CampoUncheckedCreateWithoutProductorInput[]
    connectOrCreate?: CampoCreateOrConnectWithoutProductorInput | CampoCreateOrConnectWithoutProductorInput[]
    createMany?: CampoCreateManyProductorInputEnvelope
    connect?: CampoWhereUniqueInput | CampoWhereUniqueInput[]
  }

  export type SolicitudMuestreoCreateNestedManyWithoutCreadoPorInput = {
    create?: XOR<SolicitudMuestreoCreateWithoutCreadoPorInput, SolicitudMuestreoUncheckedCreateWithoutCreadoPorInput> | SolicitudMuestreoCreateWithoutCreadoPorInput[] | SolicitudMuestreoUncheckedCreateWithoutCreadoPorInput[]
    connectOrCreate?: SolicitudMuestreoCreateOrConnectWithoutCreadoPorInput | SolicitudMuestreoCreateOrConnectWithoutCreadoPorInput[]
    createMany?: SolicitudMuestreoCreateManyCreadoPorInputEnvelope
    connect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
  }

  export type SolicitudMuestreoCreateNestedManyWithoutAsignadoAInput = {
    create?: XOR<SolicitudMuestreoCreateWithoutAsignadoAInput, SolicitudMuestreoUncheckedCreateWithoutAsignadoAInput> | SolicitudMuestreoCreateWithoutAsignadoAInput[] | SolicitudMuestreoUncheckedCreateWithoutAsignadoAInput[]
    connectOrCreate?: SolicitudMuestreoCreateOrConnectWithoutAsignadoAInput | SolicitudMuestreoCreateOrConnectWithoutAsignadoAInput[]
    createMany?: SolicitudMuestreoCreateManyAsignadoAInputEnvelope
    connect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
  }

  export type AnalysisCreateNestedManyWithoutRequesterInput = {
    create?: XOR<AnalysisCreateWithoutRequesterInput, AnalysisUncheckedCreateWithoutRequesterInput> | AnalysisCreateWithoutRequesterInput[] | AnalysisUncheckedCreateWithoutRequesterInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutRequesterInput | AnalysisCreateOrConnectWithoutRequesterInput[]
    createMany?: AnalysisCreateManyRequesterInputEnvelope
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
  }

  export type AnalysisCreateNestedManyWithoutProductorInput = {
    create?: XOR<AnalysisCreateWithoutProductorInput, AnalysisUncheckedCreateWithoutProductorInput> | AnalysisCreateWithoutProductorInput[] | AnalysisUncheckedCreateWithoutProductorInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutProductorInput | AnalysisCreateOrConnectWithoutProductorInput[]
    createMany?: AnalysisCreateManyProductorInputEnvelope
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
  }

  export type AnalysisCreateNestedManyWithoutValidadoPorInput = {
    create?: XOR<AnalysisCreateWithoutValidadoPorInput, AnalysisUncheckedCreateWithoutValidadoPorInput> | AnalysisCreateWithoutValidadoPorInput[] | AnalysisUncheckedCreateWithoutValidadoPorInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutValidadoPorInput | AnalysisCreateOrConnectWithoutValidadoPorInput[]
    createMany?: AnalysisCreateManyValidadoPorInputEnvelope
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
  }

  export type UserCampoUncheckedCreateNestedManyWithoutUserInput = {
    create?: XOR<UserCampoCreateWithoutUserInput, UserCampoUncheckedCreateWithoutUserInput> | UserCampoCreateWithoutUserInput[] | UserCampoUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserCampoCreateOrConnectWithoutUserInput | UserCampoCreateOrConnectWithoutUserInput[]
    createMany?: UserCampoCreateManyUserInputEnvelope
    connect?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
  }

  export type CampoUncheckedCreateNestedManyWithoutProductorInput = {
    create?: XOR<CampoCreateWithoutProductorInput, CampoUncheckedCreateWithoutProductorInput> | CampoCreateWithoutProductorInput[] | CampoUncheckedCreateWithoutProductorInput[]
    connectOrCreate?: CampoCreateOrConnectWithoutProductorInput | CampoCreateOrConnectWithoutProductorInput[]
    createMany?: CampoCreateManyProductorInputEnvelope
    connect?: CampoWhereUniqueInput | CampoWhereUniqueInput[]
  }

  export type SolicitudMuestreoUncheckedCreateNestedManyWithoutCreadoPorInput = {
    create?: XOR<SolicitudMuestreoCreateWithoutCreadoPorInput, SolicitudMuestreoUncheckedCreateWithoutCreadoPorInput> | SolicitudMuestreoCreateWithoutCreadoPorInput[] | SolicitudMuestreoUncheckedCreateWithoutCreadoPorInput[]
    connectOrCreate?: SolicitudMuestreoCreateOrConnectWithoutCreadoPorInput | SolicitudMuestreoCreateOrConnectWithoutCreadoPorInput[]
    createMany?: SolicitudMuestreoCreateManyCreadoPorInputEnvelope
    connect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
  }

  export type SolicitudMuestreoUncheckedCreateNestedManyWithoutAsignadoAInput = {
    create?: XOR<SolicitudMuestreoCreateWithoutAsignadoAInput, SolicitudMuestreoUncheckedCreateWithoutAsignadoAInput> | SolicitudMuestreoCreateWithoutAsignadoAInput[] | SolicitudMuestreoUncheckedCreateWithoutAsignadoAInput[]
    connectOrCreate?: SolicitudMuestreoCreateOrConnectWithoutAsignadoAInput | SolicitudMuestreoCreateOrConnectWithoutAsignadoAInput[]
    createMany?: SolicitudMuestreoCreateManyAsignadoAInputEnvelope
    connect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
  }

  export type AnalysisUncheckedCreateNestedManyWithoutRequesterInput = {
    create?: XOR<AnalysisCreateWithoutRequesterInput, AnalysisUncheckedCreateWithoutRequesterInput> | AnalysisCreateWithoutRequesterInput[] | AnalysisUncheckedCreateWithoutRequesterInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutRequesterInput | AnalysisCreateOrConnectWithoutRequesterInput[]
    createMany?: AnalysisCreateManyRequesterInputEnvelope
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
  }

  export type AnalysisUncheckedCreateNestedManyWithoutProductorInput = {
    create?: XOR<AnalysisCreateWithoutProductorInput, AnalysisUncheckedCreateWithoutProductorInput> | AnalysisCreateWithoutProductorInput[] | AnalysisUncheckedCreateWithoutProductorInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutProductorInput | AnalysisCreateOrConnectWithoutProductorInput[]
    createMany?: AnalysisCreateManyProductorInputEnvelope
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
  }

  export type AnalysisUncheckedCreateNestedManyWithoutValidadoPorInput = {
    create?: XOR<AnalysisCreateWithoutValidadoPorInput, AnalysisUncheckedCreateWithoutValidadoPorInput> | AnalysisCreateWithoutValidadoPorInput[] | AnalysisUncheckedCreateWithoutValidadoPorInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutValidadoPorInput | AnalysisCreateOrConnectWithoutValidadoPorInput[]
    createMany?: AnalysisCreateManyValidadoPorInputEnvelope
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type EnumRoleFieldUpdateOperationsInput = {
    set?: $Enums.Role
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type UserCampoUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserCampoCreateWithoutUserInput, UserCampoUncheckedCreateWithoutUserInput> | UserCampoCreateWithoutUserInput[] | UserCampoUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserCampoCreateOrConnectWithoutUserInput | UserCampoCreateOrConnectWithoutUserInput[]
    upsert?: UserCampoUpsertWithWhereUniqueWithoutUserInput | UserCampoUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserCampoCreateManyUserInputEnvelope
    set?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    disconnect?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    delete?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    connect?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    update?: UserCampoUpdateWithWhereUniqueWithoutUserInput | UserCampoUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserCampoUpdateManyWithWhereWithoutUserInput | UserCampoUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserCampoScalarWhereInput | UserCampoScalarWhereInput[]
  }

  export type CampoUpdateManyWithoutProductorNestedInput = {
    create?: XOR<CampoCreateWithoutProductorInput, CampoUncheckedCreateWithoutProductorInput> | CampoCreateWithoutProductorInput[] | CampoUncheckedCreateWithoutProductorInput[]
    connectOrCreate?: CampoCreateOrConnectWithoutProductorInput | CampoCreateOrConnectWithoutProductorInput[]
    upsert?: CampoUpsertWithWhereUniqueWithoutProductorInput | CampoUpsertWithWhereUniqueWithoutProductorInput[]
    createMany?: CampoCreateManyProductorInputEnvelope
    set?: CampoWhereUniqueInput | CampoWhereUniqueInput[]
    disconnect?: CampoWhereUniqueInput | CampoWhereUniqueInput[]
    delete?: CampoWhereUniqueInput | CampoWhereUniqueInput[]
    connect?: CampoWhereUniqueInput | CampoWhereUniqueInput[]
    update?: CampoUpdateWithWhereUniqueWithoutProductorInput | CampoUpdateWithWhereUniqueWithoutProductorInput[]
    updateMany?: CampoUpdateManyWithWhereWithoutProductorInput | CampoUpdateManyWithWhereWithoutProductorInput[]
    deleteMany?: CampoScalarWhereInput | CampoScalarWhereInput[]
  }

  export type SolicitudMuestreoUpdateManyWithoutCreadoPorNestedInput = {
    create?: XOR<SolicitudMuestreoCreateWithoutCreadoPorInput, SolicitudMuestreoUncheckedCreateWithoutCreadoPorInput> | SolicitudMuestreoCreateWithoutCreadoPorInput[] | SolicitudMuestreoUncheckedCreateWithoutCreadoPorInput[]
    connectOrCreate?: SolicitudMuestreoCreateOrConnectWithoutCreadoPorInput | SolicitudMuestreoCreateOrConnectWithoutCreadoPorInput[]
    upsert?: SolicitudMuestreoUpsertWithWhereUniqueWithoutCreadoPorInput | SolicitudMuestreoUpsertWithWhereUniqueWithoutCreadoPorInput[]
    createMany?: SolicitudMuestreoCreateManyCreadoPorInputEnvelope
    set?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    disconnect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    delete?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    connect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    update?: SolicitudMuestreoUpdateWithWhereUniqueWithoutCreadoPorInput | SolicitudMuestreoUpdateWithWhereUniqueWithoutCreadoPorInput[]
    updateMany?: SolicitudMuestreoUpdateManyWithWhereWithoutCreadoPorInput | SolicitudMuestreoUpdateManyWithWhereWithoutCreadoPorInput[]
    deleteMany?: SolicitudMuestreoScalarWhereInput | SolicitudMuestreoScalarWhereInput[]
  }

  export type SolicitudMuestreoUpdateManyWithoutAsignadoANestedInput = {
    create?: XOR<SolicitudMuestreoCreateWithoutAsignadoAInput, SolicitudMuestreoUncheckedCreateWithoutAsignadoAInput> | SolicitudMuestreoCreateWithoutAsignadoAInput[] | SolicitudMuestreoUncheckedCreateWithoutAsignadoAInput[]
    connectOrCreate?: SolicitudMuestreoCreateOrConnectWithoutAsignadoAInput | SolicitudMuestreoCreateOrConnectWithoutAsignadoAInput[]
    upsert?: SolicitudMuestreoUpsertWithWhereUniqueWithoutAsignadoAInput | SolicitudMuestreoUpsertWithWhereUniqueWithoutAsignadoAInput[]
    createMany?: SolicitudMuestreoCreateManyAsignadoAInputEnvelope
    set?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    disconnect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    delete?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    connect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    update?: SolicitudMuestreoUpdateWithWhereUniqueWithoutAsignadoAInput | SolicitudMuestreoUpdateWithWhereUniqueWithoutAsignadoAInput[]
    updateMany?: SolicitudMuestreoUpdateManyWithWhereWithoutAsignadoAInput | SolicitudMuestreoUpdateManyWithWhereWithoutAsignadoAInput[]
    deleteMany?: SolicitudMuestreoScalarWhereInput | SolicitudMuestreoScalarWhereInput[]
  }

  export type AnalysisUpdateManyWithoutRequesterNestedInput = {
    create?: XOR<AnalysisCreateWithoutRequesterInput, AnalysisUncheckedCreateWithoutRequesterInput> | AnalysisCreateWithoutRequesterInput[] | AnalysisUncheckedCreateWithoutRequesterInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutRequesterInput | AnalysisCreateOrConnectWithoutRequesterInput[]
    upsert?: AnalysisUpsertWithWhereUniqueWithoutRequesterInput | AnalysisUpsertWithWhereUniqueWithoutRequesterInput[]
    createMany?: AnalysisCreateManyRequesterInputEnvelope
    set?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    disconnect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    delete?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    update?: AnalysisUpdateWithWhereUniqueWithoutRequesterInput | AnalysisUpdateWithWhereUniqueWithoutRequesterInput[]
    updateMany?: AnalysisUpdateManyWithWhereWithoutRequesterInput | AnalysisUpdateManyWithWhereWithoutRequesterInput[]
    deleteMany?: AnalysisScalarWhereInput | AnalysisScalarWhereInput[]
  }

  export type AnalysisUpdateManyWithoutProductorNestedInput = {
    create?: XOR<AnalysisCreateWithoutProductorInput, AnalysisUncheckedCreateWithoutProductorInput> | AnalysisCreateWithoutProductorInput[] | AnalysisUncheckedCreateWithoutProductorInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutProductorInput | AnalysisCreateOrConnectWithoutProductorInput[]
    upsert?: AnalysisUpsertWithWhereUniqueWithoutProductorInput | AnalysisUpsertWithWhereUniqueWithoutProductorInput[]
    createMany?: AnalysisCreateManyProductorInputEnvelope
    set?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    disconnect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    delete?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    update?: AnalysisUpdateWithWhereUniqueWithoutProductorInput | AnalysisUpdateWithWhereUniqueWithoutProductorInput[]
    updateMany?: AnalysisUpdateManyWithWhereWithoutProductorInput | AnalysisUpdateManyWithWhereWithoutProductorInput[]
    deleteMany?: AnalysisScalarWhereInput | AnalysisScalarWhereInput[]
  }

  export type AnalysisUpdateManyWithoutValidadoPorNestedInput = {
    create?: XOR<AnalysisCreateWithoutValidadoPorInput, AnalysisUncheckedCreateWithoutValidadoPorInput> | AnalysisCreateWithoutValidadoPorInput[] | AnalysisUncheckedCreateWithoutValidadoPorInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutValidadoPorInput | AnalysisCreateOrConnectWithoutValidadoPorInput[]
    upsert?: AnalysisUpsertWithWhereUniqueWithoutValidadoPorInput | AnalysisUpsertWithWhereUniqueWithoutValidadoPorInput[]
    createMany?: AnalysisCreateManyValidadoPorInputEnvelope
    set?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    disconnect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    delete?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    update?: AnalysisUpdateWithWhereUniqueWithoutValidadoPorInput | AnalysisUpdateWithWhereUniqueWithoutValidadoPorInput[]
    updateMany?: AnalysisUpdateManyWithWhereWithoutValidadoPorInput | AnalysisUpdateManyWithWhereWithoutValidadoPorInput[]
    deleteMany?: AnalysisScalarWhereInput | AnalysisScalarWhereInput[]
  }

  export type UserCampoUncheckedUpdateManyWithoutUserNestedInput = {
    create?: XOR<UserCampoCreateWithoutUserInput, UserCampoUncheckedCreateWithoutUserInput> | UserCampoCreateWithoutUserInput[] | UserCampoUncheckedCreateWithoutUserInput[]
    connectOrCreate?: UserCampoCreateOrConnectWithoutUserInput | UserCampoCreateOrConnectWithoutUserInput[]
    upsert?: UserCampoUpsertWithWhereUniqueWithoutUserInput | UserCampoUpsertWithWhereUniqueWithoutUserInput[]
    createMany?: UserCampoCreateManyUserInputEnvelope
    set?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    disconnect?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    delete?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    connect?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    update?: UserCampoUpdateWithWhereUniqueWithoutUserInput | UserCampoUpdateWithWhereUniqueWithoutUserInput[]
    updateMany?: UserCampoUpdateManyWithWhereWithoutUserInput | UserCampoUpdateManyWithWhereWithoutUserInput[]
    deleteMany?: UserCampoScalarWhereInput | UserCampoScalarWhereInput[]
  }

  export type CampoUncheckedUpdateManyWithoutProductorNestedInput = {
    create?: XOR<CampoCreateWithoutProductorInput, CampoUncheckedCreateWithoutProductorInput> | CampoCreateWithoutProductorInput[] | CampoUncheckedCreateWithoutProductorInput[]
    connectOrCreate?: CampoCreateOrConnectWithoutProductorInput | CampoCreateOrConnectWithoutProductorInput[]
    upsert?: CampoUpsertWithWhereUniqueWithoutProductorInput | CampoUpsertWithWhereUniqueWithoutProductorInput[]
    createMany?: CampoCreateManyProductorInputEnvelope
    set?: CampoWhereUniqueInput | CampoWhereUniqueInput[]
    disconnect?: CampoWhereUniqueInput | CampoWhereUniqueInput[]
    delete?: CampoWhereUniqueInput | CampoWhereUniqueInput[]
    connect?: CampoWhereUniqueInput | CampoWhereUniqueInput[]
    update?: CampoUpdateWithWhereUniqueWithoutProductorInput | CampoUpdateWithWhereUniqueWithoutProductorInput[]
    updateMany?: CampoUpdateManyWithWhereWithoutProductorInput | CampoUpdateManyWithWhereWithoutProductorInput[]
    deleteMany?: CampoScalarWhereInput | CampoScalarWhereInput[]
  }

  export type SolicitudMuestreoUncheckedUpdateManyWithoutCreadoPorNestedInput = {
    create?: XOR<SolicitudMuestreoCreateWithoutCreadoPorInput, SolicitudMuestreoUncheckedCreateWithoutCreadoPorInput> | SolicitudMuestreoCreateWithoutCreadoPorInput[] | SolicitudMuestreoUncheckedCreateWithoutCreadoPorInput[]
    connectOrCreate?: SolicitudMuestreoCreateOrConnectWithoutCreadoPorInput | SolicitudMuestreoCreateOrConnectWithoutCreadoPorInput[]
    upsert?: SolicitudMuestreoUpsertWithWhereUniqueWithoutCreadoPorInput | SolicitudMuestreoUpsertWithWhereUniqueWithoutCreadoPorInput[]
    createMany?: SolicitudMuestreoCreateManyCreadoPorInputEnvelope
    set?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    disconnect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    delete?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    connect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    update?: SolicitudMuestreoUpdateWithWhereUniqueWithoutCreadoPorInput | SolicitudMuestreoUpdateWithWhereUniqueWithoutCreadoPorInput[]
    updateMany?: SolicitudMuestreoUpdateManyWithWhereWithoutCreadoPorInput | SolicitudMuestreoUpdateManyWithWhereWithoutCreadoPorInput[]
    deleteMany?: SolicitudMuestreoScalarWhereInput | SolicitudMuestreoScalarWhereInput[]
  }

  export type SolicitudMuestreoUncheckedUpdateManyWithoutAsignadoANestedInput = {
    create?: XOR<SolicitudMuestreoCreateWithoutAsignadoAInput, SolicitudMuestreoUncheckedCreateWithoutAsignadoAInput> | SolicitudMuestreoCreateWithoutAsignadoAInput[] | SolicitudMuestreoUncheckedCreateWithoutAsignadoAInput[]
    connectOrCreate?: SolicitudMuestreoCreateOrConnectWithoutAsignadoAInput | SolicitudMuestreoCreateOrConnectWithoutAsignadoAInput[]
    upsert?: SolicitudMuestreoUpsertWithWhereUniqueWithoutAsignadoAInput | SolicitudMuestreoUpsertWithWhereUniqueWithoutAsignadoAInput[]
    createMany?: SolicitudMuestreoCreateManyAsignadoAInputEnvelope
    set?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    disconnect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    delete?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    connect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    update?: SolicitudMuestreoUpdateWithWhereUniqueWithoutAsignadoAInput | SolicitudMuestreoUpdateWithWhereUniqueWithoutAsignadoAInput[]
    updateMany?: SolicitudMuestreoUpdateManyWithWhereWithoutAsignadoAInput | SolicitudMuestreoUpdateManyWithWhereWithoutAsignadoAInput[]
    deleteMany?: SolicitudMuestreoScalarWhereInput | SolicitudMuestreoScalarWhereInput[]
  }

  export type AnalysisUncheckedUpdateManyWithoutRequesterNestedInput = {
    create?: XOR<AnalysisCreateWithoutRequesterInput, AnalysisUncheckedCreateWithoutRequesterInput> | AnalysisCreateWithoutRequesterInput[] | AnalysisUncheckedCreateWithoutRequesterInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutRequesterInput | AnalysisCreateOrConnectWithoutRequesterInput[]
    upsert?: AnalysisUpsertWithWhereUniqueWithoutRequesterInput | AnalysisUpsertWithWhereUniqueWithoutRequesterInput[]
    createMany?: AnalysisCreateManyRequesterInputEnvelope
    set?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    disconnect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    delete?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    update?: AnalysisUpdateWithWhereUniqueWithoutRequesterInput | AnalysisUpdateWithWhereUniqueWithoutRequesterInput[]
    updateMany?: AnalysisUpdateManyWithWhereWithoutRequesterInput | AnalysisUpdateManyWithWhereWithoutRequesterInput[]
    deleteMany?: AnalysisScalarWhereInput | AnalysisScalarWhereInput[]
  }

  export type AnalysisUncheckedUpdateManyWithoutProductorNestedInput = {
    create?: XOR<AnalysisCreateWithoutProductorInput, AnalysisUncheckedCreateWithoutProductorInput> | AnalysisCreateWithoutProductorInput[] | AnalysisUncheckedCreateWithoutProductorInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutProductorInput | AnalysisCreateOrConnectWithoutProductorInput[]
    upsert?: AnalysisUpsertWithWhereUniqueWithoutProductorInput | AnalysisUpsertWithWhereUniqueWithoutProductorInput[]
    createMany?: AnalysisCreateManyProductorInputEnvelope
    set?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    disconnect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    delete?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    update?: AnalysisUpdateWithWhereUniqueWithoutProductorInput | AnalysisUpdateWithWhereUniqueWithoutProductorInput[]
    updateMany?: AnalysisUpdateManyWithWhereWithoutProductorInput | AnalysisUpdateManyWithWhereWithoutProductorInput[]
    deleteMany?: AnalysisScalarWhereInput | AnalysisScalarWhereInput[]
  }

  export type AnalysisUncheckedUpdateManyWithoutValidadoPorNestedInput = {
    create?: XOR<AnalysisCreateWithoutValidadoPorInput, AnalysisUncheckedCreateWithoutValidadoPorInput> | AnalysisCreateWithoutValidadoPorInput[] | AnalysisUncheckedCreateWithoutValidadoPorInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutValidadoPorInput | AnalysisCreateOrConnectWithoutValidadoPorInput[]
    upsert?: AnalysisUpsertWithWhereUniqueWithoutValidadoPorInput | AnalysisUpsertWithWhereUniqueWithoutValidadoPorInput[]
    createMany?: AnalysisCreateManyValidadoPorInputEnvelope
    set?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    disconnect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    delete?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    update?: AnalysisUpdateWithWhereUniqueWithoutValidadoPorInput | AnalysisUpdateWithWhereUniqueWithoutValidadoPorInput[]
    updateMany?: AnalysisUpdateManyWithWhereWithoutValidadoPorInput | AnalysisUpdateManyWithWhereWithoutValidadoPorInput[]
    deleteMany?: AnalysisScalarWhereInput | AnalysisScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutCamposProductorInput = {
    create?: XOR<UserCreateWithoutCamposProductorInput, UserUncheckedCreateWithoutCamposProductorInput>
    connectOrCreate?: UserCreateOrConnectWithoutCamposProductorInput
    connect?: UserWhereUniqueInput
  }

  export type UserCampoCreateNestedManyWithoutCampoInput = {
    create?: XOR<UserCampoCreateWithoutCampoInput, UserCampoUncheckedCreateWithoutCampoInput> | UserCampoCreateWithoutCampoInput[] | UserCampoUncheckedCreateWithoutCampoInput[]
    connectOrCreate?: UserCampoCreateOrConnectWithoutCampoInput | UserCampoCreateOrConnectWithoutCampoInput[]
    createMany?: UserCampoCreateManyCampoInputEnvelope
    connect?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
  }

  export type SolicitudMuestreoCreateNestedManyWithoutCampoInput = {
    create?: XOR<SolicitudMuestreoCreateWithoutCampoInput, SolicitudMuestreoUncheckedCreateWithoutCampoInput> | SolicitudMuestreoCreateWithoutCampoInput[] | SolicitudMuestreoUncheckedCreateWithoutCampoInput[]
    connectOrCreate?: SolicitudMuestreoCreateOrConnectWithoutCampoInput | SolicitudMuestreoCreateOrConnectWithoutCampoInput[]
    createMany?: SolicitudMuestreoCreateManyCampoInputEnvelope
    connect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
  }

  export type AnalysisCreateNestedManyWithoutCampoInput = {
    create?: XOR<AnalysisCreateWithoutCampoInput, AnalysisUncheckedCreateWithoutCampoInput> | AnalysisCreateWithoutCampoInput[] | AnalysisUncheckedCreateWithoutCampoInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutCampoInput | AnalysisCreateOrConnectWithoutCampoInput[]
    createMany?: AnalysisCreateManyCampoInputEnvelope
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
  }

  export type UserCampoUncheckedCreateNestedManyWithoutCampoInput = {
    create?: XOR<UserCampoCreateWithoutCampoInput, UserCampoUncheckedCreateWithoutCampoInput> | UserCampoCreateWithoutCampoInput[] | UserCampoUncheckedCreateWithoutCampoInput[]
    connectOrCreate?: UserCampoCreateOrConnectWithoutCampoInput | UserCampoCreateOrConnectWithoutCampoInput[]
    createMany?: UserCampoCreateManyCampoInputEnvelope
    connect?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
  }

  export type SolicitudMuestreoUncheckedCreateNestedManyWithoutCampoInput = {
    create?: XOR<SolicitudMuestreoCreateWithoutCampoInput, SolicitudMuestreoUncheckedCreateWithoutCampoInput> | SolicitudMuestreoCreateWithoutCampoInput[] | SolicitudMuestreoUncheckedCreateWithoutCampoInput[]
    connectOrCreate?: SolicitudMuestreoCreateOrConnectWithoutCampoInput | SolicitudMuestreoCreateOrConnectWithoutCampoInput[]
    createMany?: SolicitudMuestreoCreateManyCampoInputEnvelope
    connect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
  }

  export type AnalysisUncheckedCreateNestedManyWithoutCampoInput = {
    create?: XOR<AnalysisCreateWithoutCampoInput, AnalysisUncheckedCreateWithoutCampoInput> | AnalysisCreateWithoutCampoInput[] | AnalysisUncheckedCreateWithoutCampoInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutCampoInput | AnalysisCreateOrConnectWithoutCampoInput[]
    createMany?: AnalysisCreateManyCampoInputEnvelope
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
  }

  export type UserUpdateOneRequiredWithoutCamposProductorNestedInput = {
    create?: XOR<UserCreateWithoutCamposProductorInput, UserUncheckedCreateWithoutCamposProductorInput>
    connectOrCreate?: UserCreateOrConnectWithoutCamposProductorInput
    upsert?: UserUpsertWithoutCamposProductorInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCamposProductorInput, UserUpdateWithoutCamposProductorInput>, UserUncheckedUpdateWithoutCamposProductorInput>
  }

  export type UserCampoUpdateManyWithoutCampoNestedInput = {
    create?: XOR<UserCampoCreateWithoutCampoInput, UserCampoUncheckedCreateWithoutCampoInput> | UserCampoCreateWithoutCampoInput[] | UserCampoUncheckedCreateWithoutCampoInput[]
    connectOrCreate?: UserCampoCreateOrConnectWithoutCampoInput | UserCampoCreateOrConnectWithoutCampoInput[]
    upsert?: UserCampoUpsertWithWhereUniqueWithoutCampoInput | UserCampoUpsertWithWhereUniqueWithoutCampoInput[]
    createMany?: UserCampoCreateManyCampoInputEnvelope
    set?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    disconnect?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    delete?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    connect?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    update?: UserCampoUpdateWithWhereUniqueWithoutCampoInput | UserCampoUpdateWithWhereUniqueWithoutCampoInput[]
    updateMany?: UserCampoUpdateManyWithWhereWithoutCampoInput | UserCampoUpdateManyWithWhereWithoutCampoInput[]
    deleteMany?: UserCampoScalarWhereInput | UserCampoScalarWhereInput[]
  }

  export type SolicitudMuestreoUpdateManyWithoutCampoNestedInput = {
    create?: XOR<SolicitudMuestreoCreateWithoutCampoInput, SolicitudMuestreoUncheckedCreateWithoutCampoInput> | SolicitudMuestreoCreateWithoutCampoInput[] | SolicitudMuestreoUncheckedCreateWithoutCampoInput[]
    connectOrCreate?: SolicitudMuestreoCreateOrConnectWithoutCampoInput | SolicitudMuestreoCreateOrConnectWithoutCampoInput[]
    upsert?: SolicitudMuestreoUpsertWithWhereUniqueWithoutCampoInput | SolicitudMuestreoUpsertWithWhereUniqueWithoutCampoInput[]
    createMany?: SolicitudMuestreoCreateManyCampoInputEnvelope
    set?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    disconnect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    delete?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    connect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    update?: SolicitudMuestreoUpdateWithWhereUniqueWithoutCampoInput | SolicitudMuestreoUpdateWithWhereUniqueWithoutCampoInput[]
    updateMany?: SolicitudMuestreoUpdateManyWithWhereWithoutCampoInput | SolicitudMuestreoUpdateManyWithWhereWithoutCampoInput[]
    deleteMany?: SolicitudMuestreoScalarWhereInput | SolicitudMuestreoScalarWhereInput[]
  }

  export type AnalysisUpdateManyWithoutCampoNestedInput = {
    create?: XOR<AnalysisCreateWithoutCampoInput, AnalysisUncheckedCreateWithoutCampoInput> | AnalysisCreateWithoutCampoInput[] | AnalysisUncheckedCreateWithoutCampoInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutCampoInput | AnalysisCreateOrConnectWithoutCampoInput[]
    upsert?: AnalysisUpsertWithWhereUniqueWithoutCampoInput | AnalysisUpsertWithWhereUniqueWithoutCampoInput[]
    createMany?: AnalysisCreateManyCampoInputEnvelope
    set?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    disconnect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    delete?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    update?: AnalysisUpdateWithWhereUniqueWithoutCampoInput | AnalysisUpdateWithWhereUniqueWithoutCampoInput[]
    updateMany?: AnalysisUpdateManyWithWhereWithoutCampoInput | AnalysisUpdateManyWithWhereWithoutCampoInput[]
    deleteMany?: AnalysisScalarWhereInput | AnalysisScalarWhereInput[]
  }

  export type UserCampoUncheckedUpdateManyWithoutCampoNestedInput = {
    create?: XOR<UserCampoCreateWithoutCampoInput, UserCampoUncheckedCreateWithoutCampoInput> | UserCampoCreateWithoutCampoInput[] | UserCampoUncheckedCreateWithoutCampoInput[]
    connectOrCreate?: UserCampoCreateOrConnectWithoutCampoInput | UserCampoCreateOrConnectWithoutCampoInput[]
    upsert?: UserCampoUpsertWithWhereUniqueWithoutCampoInput | UserCampoUpsertWithWhereUniqueWithoutCampoInput[]
    createMany?: UserCampoCreateManyCampoInputEnvelope
    set?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    disconnect?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    delete?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    connect?: UserCampoWhereUniqueInput | UserCampoWhereUniqueInput[]
    update?: UserCampoUpdateWithWhereUniqueWithoutCampoInput | UserCampoUpdateWithWhereUniqueWithoutCampoInput[]
    updateMany?: UserCampoUpdateManyWithWhereWithoutCampoInput | UserCampoUpdateManyWithWhereWithoutCampoInput[]
    deleteMany?: UserCampoScalarWhereInput | UserCampoScalarWhereInput[]
  }

  export type SolicitudMuestreoUncheckedUpdateManyWithoutCampoNestedInput = {
    create?: XOR<SolicitudMuestreoCreateWithoutCampoInput, SolicitudMuestreoUncheckedCreateWithoutCampoInput> | SolicitudMuestreoCreateWithoutCampoInput[] | SolicitudMuestreoUncheckedCreateWithoutCampoInput[]
    connectOrCreate?: SolicitudMuestreoCreateOrConnectWithoutCampoInput | SolicitudMuestreoCreateOrConnectWithoutCampoInput[]
    upsert?: SolicitudMuestreoUpsertWithWhereUniqueWithoutCampoInput | SolicitudMuestreoUpsertWithWhereUniqueWithoutCampoInput[]
    createMany?: SolicitudMuestreoCreateManyCampoInputEnvelope
    set?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    disconnect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    delete?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    connect?: SolicitudMuestreoWhereUniqueInput | SolicitudMuestreoWhereUniqueInput[]
    update?: SolicitudMuestreoUpdateWithWhereUniqueWithoutCampoInput | SolicitudMuestreoUpdateWithWhereUniqueWithoutCampoInput[]
    updateMany?: SolicitudMuestreoUpdateManyWithWhereWithoutCampoInput | SolicitudMuestreoUpdateManyWithWhereWithoutCampoInput[]
    deleteMany?: SolicitudMuestreoScalarWhereInput | SolicitudMuestreoScalarWhereInput[]
  }

  export type AnalysisUncheckedUpdateManyWithoutCampoNestedInput = {
    create?: XOR<AnalysisCreateWithoutCampoInput, AnalysisUncheckedCreateWithoutCampoInput> | AnalysisCreateWithoutCampoInput[] | AnalysisUncheckedCreateWithoutCampoInput[]
    connectOrCreate?: AnalysisCreateOrConnectWithoutCampoInput | AnalysisCreateOrConnectWithoutCampoInput[]
    upsert?: AnalysisUpsertWithWhereUniqueWithoutCampoInput | AnalysisUpsertWithWhereUniqueWithoutCampoInput[]
    createMany?: AnalysisCreateManyCampoInputEnvelope
    set?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    disconnect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    delete?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    connect?: AnalysisWhereUniqueInput | AnalysisWhereUniqueInput[]
    update?: AnalysisUpdateWithWhereUniqueWithoutCampoInput | AnalysisUpdateWithWhereUniqueWithoutCampoInput[]
    updateMany?: AnalysisUpdateManyWithWhereWithoutCampoInput | AnalysisUpdateManyWithWhereWithoutCampoInput[]
    deleteMany?: AnalysisScalarWhereInput | AnalysisScalarWhereInput[]
  }

  export type UserCreateNestedOneWithoutCamposAsignadosInput = {
    create?: XOR<UserCreateWithoutCamposAsignadosInput, UserUncheckedCreateWithoutCamposAsignadosInput>
    connectOrCreate?: UserCreateOrConnectWithoutCamposAsignadosInput
    connect?: UserWhereUniqueInput
  }

  export type CampoCreateNestedOneWithoutUsuariosInput = {
    create?: XOR<CampoCreateWithoutUsuariosInput, CampoUncheckedCreateWithoutUsuariosInput>
    connectOrCreate?: CampoCreateOrConnectWithoutUsuariosInput
    connect?: CampoWhereUniqueInput
  }

  export type UserUpdateOneRequiredWithoutCamposAsignadosNestedInput = {
    create?: XOR<UserCreateWithoutCamposAsignadosInput, UserUncheckedCreateWithoutCamposAsignadosInput>
    connectOrCreate?: UserCreateOrConnectWithoutCamposAsignadosInput
    upsert?: UserUpsertWithoutCamposAsignadosInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutCamposAsignadosInput, UserUpdateWithoutCamposAsignadosInput>, UserUncheckedUpdateWithoutCamposAsignadosInput>
  }

  export type CampoUpdateOneRequiredWithoutUsuariosNestedInput = {
    create?: XOR<CampoCreateWithoutUsuariosInput, CampoUncheckedCreateWithoutUsuariosInput>
    connectOrCreate?: CampoCreateOrConnectWithoutUsuariosInput
    upsert?: CampoUpsertWithoutUsuariosInput
    connect?: CampoWhereUniqueInput
    update?: XOR<XOR<CampoUpdateToOneWithWhereWithoutUsuariosInput, CampoUpdateWithoutUsuariosInput>, CampoUncheckedUpdateWithoutUsuariosInput>
  }

  export type UserCreateNestedOneWithoutSolicitudesCreadasInput = {
    create?: XOR<UserCreateWithoutSolicitudesCreadasInput, UserUncheckedCreateWithoutSolicitudesCreadasInput>
    connectOrCreate?: UserCreateOrConnectWithoutSolicitudesCreadasInput
    connect?: UserWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutSolicitudesAsignadasInput = {
    create?: XOR<UserCreateWithoutSolicitudesAsignadasInput, UserUncheckedCreateWithoutSolicitudesAsignadasInput>
    connectOrCreate?: UserCreateOrConnectWithoutSolicitudesAsignadasInput
    connect?: UserWhereUniqueInput
  }

  export type CampoCreateNestedOneWithoutSolicitudesInput = {
    create?: XOR<CampoCreateWithoutSolicitudesInput, CampoUncheckedCreateWithoutSolicitudesInput>
    connectOrCreate?: CampoCreateOrConnectWithoutSolicitudesInput
    connect?: CampoWhereUniqueInput
  }

  export type EnumEstadoSolicitudFieldUpdateOperationsInput = {
    set?: $Enums.EstadoSolicitud
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type UserUpdateOneRequiredWithoutSolicitudesCreadasNestedInput = {
    create?: XOR<UserCreateWithoutSolicitudesCreadasInput, UserUncheckedCreateWithoutSolicitudesCreadasInput>
    connectOrCreate?: UserCreateOrConnectWithoutSolicitudesCreadasInput
    upsert?: UserUpsertWithoutSolicitudesCreadasInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSolicitudesCreadasInput, UserUpdateWithoutSolicitudesCreadasInput>, UserUncheckedUpdateWithoutSolicitudesCreadasInput>
  }

  export type UserUpdateOneRequiredWithoutSolicitudesAsignadasNestedInput = {
    create?: XOR<UserCreateWithoutSolicitudesAsignadasInput, UserUncheckedCreateWithoutSolicitudesAsignadasInput>
    connectOrCreate?: UserCreateOrConnectWithoutSolicitudesAsignadasInput
    upsert?: UserUpsertWithoutSolicitudesAsignadasInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutSolicitudesAsignadasInput, UserUpdateWithoutSolicitudesAsignadasInput>, UserUncheckedUpdateWithoutSolicitudesAsignadasInput>
  }

  export type CampoUpdateOneRequiredWithoutSolicitudesNestedInput = {
    create?: XOR<CampoCreateWithoutSolicitudesInput, CampoUncheckedCreateWithoutSolicitudesInput>
    connectOrCreate?: CampoCreateOrConnectWithoutSolicitudesInput
    upsert?: CampoUpsertWithoutSolicitudesInput
    connect?: CampoWhereUniqueInput
    update?: XOR<XOR<CampoUpdateToOneWithWhereWithoutSolicitudesInput, CampoUpdateWithoutSolicitudesInput>, CampoUncheckedUpdateWithoutSolicitudesInput>
  }

  export type UserCreateNestedOneWithoutAnalysesAsRequesterInput = {
    create?: XOR<UserCreateWithoutAnalysesAsRequesterInput, UserUncheckedCreateWithoutAnalysesAsRequesterInput>
    connectOrCreate?: UserCreateOrConnectWithoutAnalysesAsRequesterInput
    connect?: UserWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutAnalysesAsProductorInput = {
    create?: XOR<UserCreateWithoutAnalysesAsProductorInput, UserUncheckedCreateWithoutAnalysesAsProductorInput>
    connectOrCreate?: UserCreateOrConnectWithoutAnalysesAsProductorInput
    connect?: UserWhereUniqueInput
  }

  export type CampoCreateNestedOneWithoutAnalysesInput = {
    create?: XOR<CampoCreateWithoutAnalysesInput, CampoUncheckedCreateWithoutAnalysesInput>
    connectOrCreate?: CampoCreateOrConnectWithoutAnalysesInput
    connect?: CampoWhereUniqueInput
  }

  export type UserCreateNestedOneWithoutAnalysesValidadasInput = {
    create?: XOR<UserCreateWithoutAnalysesValidadasInput, UserUncheckedCreateWithoutAnalysesValidadasInput>
    connectOrCreate?: UserCreateOrConnectWithoutAnalysesValidadasInput
    connect?: UserWhereUniqueInput
  }

  export type FenologiaEtapaCreateNestedManyWithoutAnalysisInput = {
    create?: XOR<FenologiaEtapaCreateWithoutAnalysisInput, FenologiaEtapaUncheckedCreateWithoutAnalysisInput> | FenologiaEtapaCreateWithoutAnalysisInput[] | FenologiaEtapaUncheckedCreateWithoutAnalysisInput[]
    connectOrCreate?: FenologiaEtapaCreateOrConnectWithoutAnalysisInput | FenologiaEtapaCreateOrConnectWithoutAnalysisInput[]
    createMany?: FenologiaEtapaCreateManyAnalysisInputEnvelope
    connect?: FenologiaEtapaWhereUniqueInput | FenologiaEtapaWhereUniqueInput[]
  }

  export type FenologiaEtapaUncheckedCreateNestedManyWithoutAnalysisInput = {
    create?: XOR<FenologiaEtapaCreateWithoutAnalysisInput, FenologiaEtapaUncheckedCreateWithoutAnalysisInput> | FenologiaEtapaCreateWithoutAnalysisInput[] | FenologiaEtapaUncheckedCreateWithoutAnalysisInput[]
    connectOrCreate?: FenologiaEtapaCreateOrConnectWithoutAnalysisInput | FenologiaEtapaCreateOrConnectWithoutAnalysisInput[]
    createMany?: FenologiaEtapaCreateManyAnalysisInputEnvelope
    connect?: FenologiaEtapaWhereUniqueInput | FenologiaEtapaWhereUniqueInput[]
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type FloatFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableFloatFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type EnumEstadoValidacionFieldUpdateOperationsInput = {
    set?: $Enums.EstadoValidacion
  }

  export type BoolFieldUpdateOperationsInput = {
    set?: boolean
  }

  export type UserUpdateOneRequiredWithoutAnalysesAsRequesterNestedInput = {
    create?: XOR<UserCreateWithoutAnalysesAsRequesterInput, UserUncheckedCreateWithoutAnalysesAsRequesterInput>
    connectOrCreate?: UserCreateOrConnectWithoutAnalysesAsRequesterInput
    upsert?: UserUpsertWithoutAnalysesAsRequesterInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAnalysesAsRequesterInput, UserUpdateWithoutAnalysesAsRequesterInput>, UserUncheckedUpdateWithoutAnalysesAsRequesterInput>
  }

  export type UserUpdateOneRequiredWithoutAnalysesAsProductorNestedInput = {
    create?: XOR<UserCreateWithoutAnalysesAsProductorInput, UserUncheckedCreateWithoutAnalysesAsProductorInput>
    connectOrCreate?: UserCreateOrConnectWithoutAnalysesAsProductorInput
    upsert?: UserUpsertWithoutAnalysesAsProductorInput
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAnalysesAsProductorInput, UserUpdateWithoutAnalysesAsProductorInput>, UserUncheckedUpdateWithoutAnalysesAsProductorInput>
  }

  export type CampoUpdateOneRequiredWithoutAnalysesNestedInput = {
    create?: XOR<CampoCreateWithoutAnalysesInput, CampoUncheckedCreateWithoutAnalysesInput>
    connectOrCreate?: CampoCreateOrConnectWithoutAnalysesInput
    upsert?: CampoUpsertWithoutAnalysesInput
    connect?: CampoWhereUniqueInput
    update?: XOR<XOR<CampoUpdateToOneWithWhereWithoutAnalysesInput, CampoUpdateWithoutAnalysesInput>, CampoUncheckedUpdateWithoutAnalysesInput>
  }

  export type UserUpdateOneWithoutAnalysesValidadasNestedInput = {
    create?: XOR<UserCreateWithoutAnalysesValidadasInput, UserUncheckedCreateWithoutAnalysesValidadasInput>
    connectOrCreate?: UserCreateOrConnectWithoutAnalysesValidadasInput
    upsert?: UserUpsertWithoutAnalysesValidadasInput
    disconnect?: UserWhereInput | boolean
    delete?: UserWhereInput | boolean
    connect?: UserWhereUniqueInput
    update?: XOR<XOR<UserUpdateToOneWithWhereWithoutAnalysesValidadasInput, UserUpdateWithoutAnalysesValidadasInput>, UserUncheckedUpdateWithoutAnalysesValidadasInput>
  }

  export type FenologiaEtapaUpdateManyWithoutAnalysisNestedInput = {
    create?: XOR<FenologiaEtapaCreateWithoutAnalysisInput, FenologiaEtapaUncheckedCreateWithoutAnalysisInput> | FenologiaEtapaCreateWithoutAnalysisInput[] | FenologiaEtapaUncheckedCreateWithoutAnalysisInput[]
    connectOrCreate?: FenologiaEtapaCreateOrConnectWithoutAnalysisInput | FenologiaEtapaCreateOrConnectWithoutAnalysisInput[]
    upsert?: FenologiaEtapaUpsertWithWhereUniqueWithoutAnalysisInput | FenologiaEtapaUpsertWithWhereUniqueWithoutAnalysisInput[]
    createMany?: FenologiaEtapaCreateManyAnalysisInputEnvelope
    set?: FenologiaEtapaWhereUniqueInput | FenologiaEtapaWhereUniqueInput[]
    disconnect?: FenologiaEtapaWhereUniqueInput | FenologiaEtapaWhereUniqueInput[]
    delete?: FenologiaEtapaWhereUniqueInput | FenologiaEtapaWhereUniqueInput[]
    connect?: FenologiaEtapaWhereUniqueInput | FenologiaEtapaWhereUniqueInput[]
    update?: FenologiaEtapaUpdateWithWhereUniqueWithoutAnalysisInput | FenologiaEtapaUpdateWithWhereUniqueWithoutAnalysisInput[]
    updateMany?: FenologiaEtapaUpdateManyWithWhereWithoutAnalysisInput | FenologiaEtapaUpdateManyWithWhereWithoutAnalysisInput[]
    deleteMany?: FenologiaEtapaScalarWhereInput | FenologiaEtapaScalarWhereInput[]
  }

  export type FenologiaEtapaUncheckedUpdateManyWithoutAnalysisNestedInput = {
    create?: XOR<FenologiaEtapaCreateWithoutAnalysisInput, FenologiaEtapaUncheckedCreateWithoutAnalysisInput> | FenologiaEtapaCreateWithoutAnalysisInput[] | FenologiaEtapaUncheckedCreateWithoutAnalysisInput[]
    connectOrCreate?: FenologiaEtapaCreateOrConnectWithoutAnalysisInput | FenologiaEtapaCreateOrConnectWithoutAnalysisInput[]
    upsert?: FenologiaEtapaUpsertWithWhereUniqueWithoutAnalysisInput | FenologiaEtapaUpsertWithWhereUniqueWithoutAnalysisInput[]
    createMany?: FenologiaEtapaCreateManyAnalysisInputEnvelope
    set?: FenologiaEtapaWhereUniqueInput | FenologiaEtapaWhereUniqueInput[]
    disconnect?: FenologiaEtapaWhereUniqueInput | FenologiaEtapaWhereUniqueInput[]
    delete?: FenologiaEtapaWhereUniqueInput | FenologiaEtapaWhereUniqueInput[]
    connect?: FenologiaEtapaWhereUniqueInput | FenologiaEtapaWhereUniqueInput[]
    update?: FenologiaEtapaUpdateWithWhereUniqueWithoutAnalysisInput | FenologiaEtapaUpdateWithWhereUniqueWithoutAnalysisInput[]
    updateMany?: FenologiaEtapaUpdateManyWithWhereWithoutAnalysisInput | FenologiaEtapaUpdateManyWithWhereWithoutAnalysisInput[]
    deleteMany?: FenologiaEtapaScalarWhereInput | FenologiaEtapaScalarWhereInput[]
  }

  export type AnalysisCreateNestedOneWithoutFenologiaEtapasInput = {
    create?: XOR<AnalysisCreateWithoutFenologiaEtapasInput, AnalysisUncheckedCreateWithoutFenologiaEtapasInput>
    connectOrCreate?: AnalysisCreateOrConnectWithoutFenologiaEtapasInput
    connect?: AnalysisWhereUniqueInput
  }

  export type AnalysisUpdateOneRequiredWithoutFenologiaEtapasNestedInput = {
    create?: XOR<AnalysisCreateWithoutFenologiaEtapasInput, AnalysisUncheckedCreateWithoutFenologiaEtapasInput>
    connectOrCreate?: AnalysisCreateOrConnectWithoutFenologiaEtapasInput
    upsert?: AnalysisUpsertWithoutFenologiaEtapasInput
    connect?: AnalysisWhereUniqueInput
    update?: XOR<XOR<AnalysisUpdateToOneWithWhereWithoutFenologiaEtapasInput, AnalysisUpdateWithoutFenologiaEtapasInput>, AnalysisUncheckedUpdateWithoutFenologiaEtapasInput>
  }

  export type NestedUuidFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidFilter<$PrismaModel> | string
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedEnumRoleFilter<$PrismaModel = never> = {
    equals?: $Enums.Role | EnumRoleFieldRefInput<$PrismaModel>
    in?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumRoleFilter<$PrismaModel> | $Enums.Role
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedUuidWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[] | ListStringFieldRefInput<$PrismaModel>
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel>
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NestedEnumRoleWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.Role | EnumRoleFieldRefInput<$PrismaModel>
    in?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    notIn?: $Enums.Role[] | ListEnumRoleFieldRefInput<$PrismaModel>
    not?: NestedEnumRoleWithAggregatesFilter<$PrismaModel> | $Enums.Role
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumRoleFilter<$PrismaModel>
    _max?: NestedEnumRoleFilter<$PrismaModel>
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel> | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel>
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }
  export type NestedJsonNullableFilter<$PrismaModel = never> =
    | PatchUndefined<
        Either<Required<NestedJsonNullableFilterBase<$PrismaModel>>, Exclude<keyof Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>,
        Required<NestedJsonNullableFilterBase<$PrismaModel>>
      >
    | OptionalFlat<Omit<Required<NestedJsonNullableFilterBase<$PrismaModel>>, 'path'>>

  export type NestedJsonNullableFilterBase<$PrismaModel = never> = {
    equals?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
    path?: string[]
    mode?: QueryMode | EnumQueryModeFieldRefInput<$PrismaModel>
    string_contains?: string | StringFieldRefInput<$PrismaModel>
    string_starts_with?: string | StringFieldRefInput<$PrismaModel>
    string_ends_with?: string | StringFieldRefInput<$PrismaModel>
    array_starts_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_ends_with?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    array_contains?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | null
    lt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    lte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gt?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    gte?: InputJsonValue | JsonFieldRefInput<$PrismaModel>
    not?: InputJsonValue | JsonFieldRefInput<$PrismaModel> | JsonNullValueFilter
  }

  export type NestedEnumEstadoSolicitudFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoSolicitud | EnumEstadoSolicitudFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoSolicitud[] | ListEnumEstadoSolicitudFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoSolicitud[] | ListEnumEstadoSolicitudFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoSolicitudFilter<$PrismaModel> | $Enums.EstadoSolicitud
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedEnumEstadoSolicitudWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoSolicitud | EnumEstadoSolicitudFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoSolicitud[] | ListEnumEstadoSolicitudFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoSolicitud[] | ListEnumEstadoSolicitudFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoSolicitudWithAggregatesFilter<$PrismaModel> | $Enums.EstadoSolicitud
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoSolicitudFilter<$PrismaModel>
    _max?: NestedEnumEstadoSolicitudFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    notIn?: Date[] | string[] | ListDateTimeFieldRefInput<$PrismaModel> | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedEnumEstadoValidacionFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoValidacion | EnumEstadoValidacionFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoValidacion[] | ListEnumEstadoValidacionFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoValidacion[] | ListEnumEstadoValidacionFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoValidacionFilter<$PrismaModel> | $Enums.EstadoValidacion
  }

  export type NestedBoolFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolFilter<$PrismaModel> | boolean
  }

  export type NestedUuidNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableFilter<$PrismaModel> | string | null
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[] | ListIntFieldRefInput<$PrismaModel>
    notIn?: number[] | ListIntFieldRefInput<$PrismaModel>
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[] | ListFloatFieldRefInput<$PrismaModel>
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel>
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedFloatFilter<$PrismaModel>
    _min?: NestedFloatFilter<$PrismaModel>
    _max?: NestedFloatFilter<$PrismaModel>
  }

  export type NestedFloatNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    notIn?: number[] | ListFloatFieldRefInput<$PrismaModel> | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedFloatNullableFilter<$PrismaModel>
    _min?: NestedFloatNullableFilter<$PrismaModel>
    _max?: NestedFloatNullableFilter<$PrismaModel>
  }

  export type NestedEnumEstadoValidacionWithAggregatesFilter<$PrismaModel = never> = {
    equals?: $Enums.EstadoValidacion | EnumEstadoValidacionFieldRefInput<$PrismaModel>
    in?: $Enums.EstadoValidacion[] | ListEnumEstadoValidacionFieldRefInput<$PrismaModel>
    notIn?: $Enums.EstadoValidacion[] | ListEnumEstadoValidacionFieldRefInput<$PrismaModel>
    not?: NestedEnumEstadoValidacionWithAggregatesFilter<$PrismaModel> | $Enums.EstadoValidacion
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedEnumEstadoValidacionFilter<$PrismaModel>
    _max?: NestedEnumEstadoValidacionFilter<$PrismaModel>
  }

  export type NestedBoolWithAggregatesFilter<$PrismaModel = never> = {
    equals?: boolean | BooleanFieldRefInput<$PrismaModel>
    not?: NestedBoolWithAggregatesFilter<$PrismaModel> | boolean
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedBoolFilter<$PrismaModel>
    _max?: NestedBoolFilter<$PrismaModel>
  }

  export type NestedUuidNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    notIn?: string[] | ListStringFieldRefInput<$PrismaModel> | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedUuidNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type UserCampoCreateWithoutUserInput = {
    campo: CampoCreateNestedOneWithoutUsuariosInput
  }

  export type UserCampoUncheckedCreateWithoutUserInput = {
    campoId: string
  }

  export type UserCampoCreateOrConnectWithoutUserInput = {
    where: UserCampoWhereUniqueInput
    create: XOR<UserCampoCreateWithoutUserInput, UserCampoUncheckedCreateWithoutUserInput>
  }

  export type UserCampoCreateManyUserInputEnvelope = {
    data: UserCampoCreateManyUserInput | UserCampoCreateManyUserInput[]
    skipDuplicates?: boolean
  }

  export type CampoCreateWithoutProductorInput = {
    id?: string
    codigoCampo: string
    nombre: string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    usuarios?: UserCampoCreateNestedManyWithoutCampoInput
    solicitudes?: SolicitudMuestreoCreateNestedManyWithoutCampoInput
    analyses?: AnalysisCreateNestedManyWithoutCampoInput
  }

  export type CampoUncheckedCreateWithoutProductorInput = {
    id?: string
    codigoCampo: string
    nombre: string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    usuarios?: UserCampoUncheckedCreateNestedManyWithoutCampoInput
    solicitudes?: SolicitudMuestreoUncheckedCreateNestedManyWithoutCampoInput
    analyses?: AnalysisUncheckedCreateNestedManyWithoutCampoInput
  }

  export type CampoCreateOrConnectWithoutProductorInput = {
    where: CampoWhereUniqueInput
    create: XOR<CampoCreateWithoutProductorInput, CampoUncheckedCreateWithoutProductorInput>
  }

  export type CampoCreateManyProductorInputEnvelope = {
    data: CampoCreateManyProductorInput | CampoCreateManyProductorInput[]
    skipDuplicates?: boolean
  }

  export type SolicitudMuestreoCreateWithoutCreadoPorInput = {
    id?: string
    mensaje: string
    estado?: $Enums.EstadoSolicitud
    fechaLimite?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    asignadoA: UserCreateNestedOneWithoutSolicitudesAsignadasInput
    campo: CampoCreateNestedOneWithoutSolicitudesInput
  }

  export type SolicitudMuestreoUncheckedCreateWithoutCreadoPorInput = {
    id?: string
    asignadoAId: string
    campoId: string
    mensaje: string
    estado?: $Enums.EstadoSolicitud
    fechaLimite?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SolicitudMuestreoCreateOrConnectWithoutCreadoPorInput = {
    where: SolicitudMuestreoWhereUniqueInput
    create: XOR<SolicitudMuestreoCreateWithoutCreadoPorInput, SolicitudMuestreoUncheckedCreateWithoutCreadoPorInput>
  }

  export type SolicitudMuestreoCreateManyCreadoPorInputEnvelope = {
    data: SolicitudMuestreoCreateManyCreadoPorInput | SolicitudMuestreoCreateManyCreadoPorInput[]
    skipDuplicates?: boolean
  }

  export type SolicitudMuestreoCreateWithoutAsignadoAInput = {
    id?: string
    mensaje: string
    estado?: $Enums.EstadoSolicitud
    fechaLimite?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    creadoPor: UserCreateNestedOneWithoutSolicitudesCreadasInput
    campo: CampoCreateNestedOneWithoutSolicitudesInput
  }

  export type SolicitudMuestreoUncheckedCreateWithoutAsignadoAInput = {
    id?: string
    creadoPorId: string
    campoId: string
    mensaje: string
    estado?: $Enums.EstadoSolicitud
    fechaLimite?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SolicitudMuestreoCreateOrConnectWithoutAsignadoAInput = {
    where: SolicitudMuestreoWhereUniqueInput
    create: XOR<SolicitudMuestreoCreateWithoutAsignadoAInput, SolicitudMuestreoUncheckedCreateWithoutAsignadoAInput>
  }

  export type SolicitudMuestreoCreateManyAsignadoAInputEnvelope = {
    data: SolicitudMuestreoCreateManyAsignadoAInput | SolicitudMuestreoCreateManyAsignadoAInput[]
    skipDuplicates?: boolean
  }

  export type AnalysisCreateWithoutRequesterInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    productor: UserCreateNestedOneWithoutAnalysesAsProductorInput
    campo: CampoCreateNestedOneWithoutAnalysesInput
    validadoPor?: UserCreateNestedOneWithoutAnalysesValidadasInput
    fenologiaEtapas?: FenologiaEtapaCreateNestedManyWithoutAnalysisInput
  }

  export type AnalysisUncheckedCreateWithoutRequesterInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    campoId: string
    productorId: string
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: string | null
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    fenologiaEtapas?: FenologiaEtapaUncheckedCreateNestedManyWithoutAnalysisInput
  }

  export type AnalysisCreateOrConnectWithoutRequesterInput = {
    where: AnalysisWhereUniqueInput
    create: XOR<AnalysisCreateWithoutRequesterInput, AnalysisUncheckedCreateWithoutRequesterInput>
  }

  export type AnalysisCreateManyRequesterInputEnvelope = {
    data: AnalysisCreateManyRequesterInput | AnalysisCreateManyRequesterInput[]
    skipDuplicates?: boolean
  }

  export type AnalysisCreateWithoutProductorInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    requester: UserCreateNestedOneWithoutAnalysesAsRequesterInput
    campo: CampoCreateNestedOneWithoutAnalysesInput
    validadoPor?: UserCreateNestedOneWithoutAnalysesValidadasInput
    fenologiaEtapas?: FenologiaEtapaCreateNestedManyWithoutAnalysisInput
  }

  export type AnalysisUncheckedCreateWithoutProductorInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterUserId: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    campoId: string
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: string | null
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    fenologiaEtapas?: FenologiaEtapaUncheckedCreateNestedManyWithoutAnalysisInput
  }

  export type AnalysisCreateOrConnectWithoutProductorInput = {
    where: AnalysisWhereUniqueInput
    create: XOR<AnalysisCreateWithoutProductorInput, AnalysisUncheckedCreateWithoutProductorInput>
  }

  export type AnalysisCreateManyProductorInputEnvelope = {
    data: AnalysisCreateManyProductorInput | AnalysisCreateManyProductorInput[]
    skipDuplicates?: boolean
  }

  export type AnalysisCreateWithoutValidadoPorInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    requester: UserCreateNestedOneWithoutAnalysesAsRequesterInput
    productor: UserCreateNestedOneWithoutAnalysesAsProductorInput
    campo: CampoCreateNestedOneWithoutAnalysesInput
    fenologiaEtapas?: FenologiaEtapaCreateNestedManyWithoutAnalysisInput
  }

  export type AnalysisUncheckedCreateWithoutValidadoPorInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterUserId: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    campoId: string
    productorId: string
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    fenologiaEtapas?: FenologiaEtapaUncheckedCreateNestedManyWithoutAnalysisInput
  }

  export type AnalysisCreateOrConnectWithoutValidadoPorInput = {
    where: AnalysisWhereUniqueInput
    create: XOR<AnalysisCreateWithoutValidadoPorInput, AnalysisUncheckedCreateWithoutValidadoPorInput>
  }

  export type AnalysisCreateManyValidadoPorInputEnvelope = {
    data: AnalysisCreateManyValidadoPorInput | AnalysisCreateManyValidadoPorInput[]
    skipDuplicates?: boolean
  }

  export type UserCampoUpsertWithWhereUniqueWithoutUserInput = {
    where: UserCampoWhereUniqueInput
    update: XOR<UserCampoUpdateWithoutUserInput, UserCampoUncheckedUpdateWithoutUserInput>
    create: XOR<UserCampoCreateWithoutUserInput, UserCampoUncheckedCreateWithoutUserInput>
  }

  export type UserCampoUpdateWithWhereUniqueWithoutUserInput = {
    where: UserCampoWhereUniqueInput
    data: XOR<UserCampoUpdateWithoutUserInput, UserCampoUncheckedUpdateWithoutUserInput>
  }

  export type UserCampoUpdateManyWithWhereWithoutUserInput = {
    where: UserCampoScalarWhereInput
    data: XOR<UserCampoUpdateManyMutationInput, UserCampoUncheckedUpdateManyWithoutUserInput>
  }

  export type UserCampoScalarWhereInput = {
    AND?: UserCampoScalarWhereInput | UserCampoScalarWhereInput[]
    OR?: UserCampoScalarWhereInput[]
    NOT?: UserCampoScalarWhereInput | UserCampoScalarWhereInput[]
    userId?: UuidFilter<"UserCampo"> | string
    campoId?: UuidFilter<"UserCampo"> | string
  }

  export type CampoUpsertWithWhereUniqueWithoutProductorInput = {
    where: CampoWhereUniqueInput
    update: XOR<CampoUpdateWithoutProductorInput, CampoUncheckedUpdateWithoutProductorInput>
    create: XOR<CampoCreateWithoutProductorInput, CampoUncheckedCreateWithoutProductorInput>
  }

  export type CampoUpdateWithWhereUniqueWithoutProductorInput = {
    where: CampoWhereUniqueInput
    data: XOR<CampoUpdateWithoutProductorInput, CampoUncheckedUpdateWithoutProductorInput>
  }

  export type CampoUpdateManyWithWhereWithoutProductorInput = {
    where: CampoScalarWhereInput
    data: XOR<CampoUpdateManyMutationInput, CampoUncheckedUpdateManyWithoutProductorInput>
  }

  export type CampoScalarWhereInput = {
    AND?: CampoScalarWhereInput | CampoScalarWhereInput[]
    OR?: CampoScalarWhereInput[]
    NOT?: CampoScalarWhereInput | CampoScalarWhereInput[]
    id?: UuidFilter<"Campo"> | string
    codigoCampo?: StringFilter<"Campo"> | string
    nombre?: StringFilter<"Campo"> | string
    productorId?: UuidFilter<"Campo"> | string
    poligonoGps?: JsonNullableFilter<"Campo">
    createdAt?: DateTimeFilter<"Campo"> | Date | string
    updatedAt?: DateTimeFilter<"Campo"> | Date | string
  }

  export type SolicitudMuestreoUpsertWithWhereUniqueWithoutCreadoPorInput = {
    where: SolicitudMuestreoWhereUniqueInput
    update: XOR<SolicitudMuestreoUpdateWithoutCreadoPorInput, SolicitudMuestreoUncheckedUpdateWithoutCreadoPorInput>
    create: XOR<SolicitudMuestreoCreateWithoutCreadoPorInput, SolicitudMuestreoUncheckedCreateWithoutCreadoPorInput>
  }

  export type SolicitudMuestreoUpdateWithWhereUniqueWithoutCreadoPorInput = {
    where: SolicitudMuestreoWhereUniqueInput
    data: XOR<SolicitudMuestreoUpdateWithoutCreadoPorInput, SolicitudMuestreoUncheckedUpdateWithoutCreadoPorInput>
  }

  export type SolicitudMuestreoUpdateManyWithWhereWithoutCreadoPorInput = {
    where: SolicitudMuestreoScalarWhereInput
    data: XOR<SolicitudMuestreoUpdateManyMutationInput, SolicitudMuestreoUncheckedUpdateManyWithoutCreadoPorInput>
  }

  export type SolicitudMuestreoScalarWhereInput = {
    AND?: SolicitudMuestreoScalarWhereInput | SolicitudMuestreoScalarWhereInput[]
    OR?: SolicitudMuestreoScalarWhereInput[]
    NOT?: SolicitudMuestreoScalarWhereInput | SolicitudMuestreoScalarWhereInput[]
    id?: UuidFilter<"SolicitudMuestreo"> | string
    creadoPorId?: UuidFilter<"SolicitudMuestreo"> | string
    asignadoAId?: UuidFilter<"SolicitudMuestreo"> | string
    campoId?: UuidFilter<"SolicitudMuestreo"> | string
    mensaje?: StringFilter<"SolicitudMuestreo"> | string
    estado?: EnumEstadoSolicitudFilter<"SolicitudMuestreo"> | $Enums.EstadoSolicitud
    fechaLimite?: DateTimeNullableFilter<"SolicitudMuestreo"> | Date | string | null
    createdAt?: DateTimeFilter<"SolicitudMuestreo"> | Date | string
    updatedAt?: DateTimeFilter<"SolicitudMuestreo"> | Date | string
  }

  export type SolicitudMuestreoUpsertWithWhereUniqueWithoutAsignadoAInput = {
    where: SolicitudMuestreoWhereUniqueInput
    update: XOR<SolicitudMuestreoUpdateWithoutAsignadoAInput, SolicitudMuestreoUncheckedUpdateWithoutAsignadoAInput>
    create: XOR<SolicitudMuestreoCreateWithoutAsignadoAInput, SolicitudMuestreoUncheckedCreateWithoutAsignadoAInput>
  }

  export type SolicitudMuestreoUpdateWithWhereUniqueWithoutAsignadoAInput = {
    where: SolicitudMuestreoWhereUniqueInput
    data: XOR<SolicitudMuestreoUpdateWithoutAsignadoAInput, SolicitudMuestreoUncheckedUpdateWithoutAsignadoAInput>
  }

  export type SolicitudMuestreoUpdateManyWithWhereWithoutAsignadoAInput = {
    where: SolicitudMuestreoScalarWhereInput
    data: XOR<SolicitudMuestreoUpdateManyMutationInput, SolicitudMuestreoUncheckedUpdateManyWithoutAsignadoAInput>
  }

  export type AnalysisUpsertWithWhereUniqueWithoutRequesterInput = {
    where: AnalysisWhereUniqueInput
    update: XOR<AnalysisUpdateWithoutRequesterInput, AnalysisUncheckedUpdateWithoutRequesterInput>
    create: XOR<AnalysisCreateWithoutRequesterInput, AnalysisUncheckedCreateWithoutRequesterInput>
  }

  export type AnalysisUpdateWithWhereUniqueWithoutRequesterInput = {
    where: AnalysisWhereUniqueInput
    data: XOR<AnalysisUpdateWithoutRequesterInput, AnalysisUncheckedUpdateWithoutRequesterInput>
  }

  export type AnalysisUpdateManyWithWhereWithoutRequesterInput = {
    where: AnalysisScalarWhereInput
    data: XOR<AnalysisUpdateManyMutationInput, AnalysisUncheckedUpdateManyWithoutRequesterInput>
  }

  export type AnalysisScalarWhereInput = {
    AND?: AnalysisScalarWhereInput | AnalysisScalarWhereInput[]
    OR?: AnalysisScalarWhereInput[]
    NOT?: AnalysisScalarWhereInput | AnalysisScalarWhereInput[]
    id?: UuidFilter<"Analysis"> | string
    imageId?: StringFilter<"Analysis"> | string
    storageKey?: StringFilter<"Analysis"> | string
    requesterUserId?: UuidFilter<"Analysis"> | string
    requesterEmail?: StringFilter<"Analysis"> | string
    variedad?: StringNullableFilter<"Analysis"> | string | null
    fechaAnalisis?: DateTimeFilter<"Analysis"> | Date | string
    totalElementosDetectados?: IntFilter<"Analysis"> | number
    elementosSanos?: IntFilter<"Analysis"> | number
    elementosEnfermos?: IntFilter<"Analysis"> | number
    porcentajeMermaGeneral?: FloatFilter<"Analysis"> | number
    pesoSanoGramos?: FloatFilter<"Analysis"> | number
    ubicacionLat?: FloatNullableFilter<"Analysis"> | number | null
    ubicacionLng?: FloatNullableFilter<"Analysis"> | number | null
    campoId?: UuidFilter<"Analysis"> | string
    productorId?: UuidFilter<"Analysis"> | string
    offlineSyncId?: StringNullableFilter<"Analysis"> | string | null
    validacionEstado?: EnumEstadoValidacionFilter<"Analysis"> | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFilter<"Analysis"> | boolean
    validacionCorregidoPorId?: UuidNullableFilter<"Analysis"> | string | null
    validacionDiagnosticoOriginal?: StringNullableFilter<"Analysis"> | string | null
    validacionCronogramaCorregido?: JsonNullableFilter<"Analysis">
    validacionObservaciones?: StringNullableFilter<"Analysis"> | string | null
    createdAt?: DateTimeFilter<"Analysis"> | Date | string
    updatedAt?: DateTimeFilter<"Analysis"> | Date | string
  }

  export type AnalysisUpsertWithWhereUniqueWithoutProductorInput = {
    where: AnalysisWhereUniqueInput
    update: XOR<AnalysisUpdateWithoutProductorInput, AnalysisUncheckedUpdateWithoutProductorInput>
    create: XOR<AnalysisCreateWithoutProductorInput, AnalysisUncheckedCreateWithoutProductorInput>
  }

  export type AnalysisUpdateWithWhereUniqueWithoutProductorInput = {
    where: AnalysisWhereUniqueInput
    data: XOR<AnalysisUpdateWithoutProductorInput, AnalysisUncheckedUpdateWithoutProductorInput>
  }

  export type AnalysisUpdateManyWithWhereWithoutProductorInput = {
    where: AnalysisScalarWhereInput
    data: XOR<AnalysisUpdateManyMutationInput, AnalysisUncheckedUpdateManyWithoutProductorInput>
  }

  export type AnalysisUpsertWithWhereUniqueWithoutValidadoPorInput = {
    where: AnalysisWhereUniqueInput
    update: XOR<AnalysisUpdateWithoutValidadoPorInput, AnalysisUncheckedUpdateWithoutValidadoPorInput>
    create: XOR<AnalysisCreateWithoutValidadoPorInput, AnalysisUncheckedCreateWithoutValidadoPorInput>
  }

  export type AnalysisUpdateWithWhereUniqueWithoutValidadoPorInput = {
    where: AnalysisWhereUniqueInput
    data: XOR<AnalysisUpdateWithoutValidadoPorInput, AnalysisUncheckedUpdateWithoutValidadoPorInput>
  }

  export type AnalysisUpdateManyWithWhereWithoutValidadoPorInput = {
    where: AnalysisScalarWhereInput
    data: XOR<AnalysisUpdateManyMutationInput, AnalysisUncheckedUpdateManyWithoutValidadoPorInput>
  }

  export type UserCreateWithoutCamposProductorInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoCreateNestedManyWithoutUserInput
    solicitudesCreadas?: SolicitudMuestreoCreateNestedManyWithoutCreadoPorInput
    solicitudesAsignadas?: SolicitudMuestreoCreateNestedManyWithoutAsignadoAInput
    analysesAsRequester?: AnalysisCreateNestedManyWithoutRequesterInput
    analysesAsProductor?: AnalysisCreateNestedManyWithoutProductorInput
    analysesValidadas?: AnalysisCreateNestedManyWithoutValidadoPorInput
  }

  export type UserUncheckedCreateWithoutCamposProductorInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoUncheckedCreateNestedManyWithoutUserInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutCreadoPorInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutAsignadoAInput
    analysesAsRequester?: AnalysisUncheckedCreateNestedManyWithoutRequesterInput
    analysesAsProductor?: AnalysisUncheckedCreateNestedManyWithoutProductorInput
    analysesValidadas?: AnalysisUncheckedCreateNestedManyWithoutValidadoPorInput
  }

  export type UserCreateOrConnectWithoutCamposProductorInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCamposProductorInput, UserUncheckedCreateWithoutCamposProductorInput>
  }

  export type UserCampoCreateWithoutCampoInput = {
    user: UserCreateNestedOneWithoutCamposAsignadosInput
  }

  export type UserCampoUncheckedCreateWithoutCampoInput = {
    userId: string
  }

  export type UserCampoCreateOrConnectWithoutCampoInput = {
    where: UserCampoWhereUniqueInput
    create: XOR<UserCampoCreateWithoutCampoInput, UserCampoUncheckedCreateWithoutCampoInput>
  }

  export type UserCampoCreateManyCampoInputEnvelope = {
    data: UserCampoCreateManyCampoInput | UserCampoCreateManyCampoInput[]
    skipDuplicates?: boolean
  }

  export type SolicitudMuestreoCreateWithoutCampoInput = {
    id?: string
    mensaje: string
    estado?: $Enums.EstadoSolicitud
    fechaLimite?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    creadoPor: UserCreateNestedOneWithoutSolicitudesCreadasInput
    asignadoA: UserCreateNestedOneWithoutSolicitudesAsignadasInput
  }

  export type SolicitudMuestreoUncheckedCreateWithoutCampoInput = {
    id?: string
    creadoPorId: string
    asignadoAId: string
    mensaje: string
    estado?: $Enums.EstadoSolicitud
    fechaLimite?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SolicitudMuestreoCreateOrConnectWithoutCampoInput = {
    where: SolicitudMuestreoWhereUniqueInput
    create: XOR<SolicitudMuestreoCreateWithoutCampoInput, SolicitudMuestreoUncheckedCreateWithoutCampoInput>
  }

  export type SolicitudMuestreoCreateManyCampoInputEnvelope = {
    data: SolicitudMuestreoCreateManyCampoInput | SolicitudMuestreoCreateManyCampoInput[]
    skipDuplicates?: boolean
  }

  export type AnalysisCreateWithoutCampoInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    requester: UserCreateNestedOneWithoutAnalysesAsRequesterInput
    productor: UserCreateNestedOneWithoutAnalysesAsProductorInput
    validadoPor?: UserCreateNestedOneWithoutAnalysesValidadasInput
    fenologiaEtapas?: FenologiaEtapaCreateNestedManyWithoutAnalysisInput
  }

  export type AnalysisUncheckedCreateWithoutCampoInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterUserId: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    productorId: string
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: string | null
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    fenologiaEtapas?: FenologiaEtapaUncheckedCreateNestedManyWithoutAnalysisInput
  }

  export type AnalysisCreateOrConnectWithoutCampoInput = {
    where: AnalysisWhereUniqueInput
    create: XOR<AnalysisCreateWithoutCampoInput, AnalysisUncheckedCreateWithoutCampoInput>
  }

  export type AnalysisCreateManyCampoInputEnvelope = {
    data: AnalysisCreateManyCampoInput | AnalysisCreateManyCampoInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutCamposProductorInput = {
    update: XOR<UserUpdateWithoutCamposProductorInput, UserUncheckedUpdateWithoutCamposProductorInput>
    create: XOR<UserCreateWithoutCamposProductorInput, UserUncheckedCreateWithoutCamposProductorInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCamposProductorInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCamposProductorInput, UserUncheckedUpdateWithoutCamposProductorInput>
  }

  export type UserUpdateWithoutCamposProductorInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUpdateManyWithoutUserNestedInput
    solicitudesCreadas?: SolicitudMuestreoUpdateManyWithoutCreadoPorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUpdateManyWithoutAsignadoANestedInput
    analysesAsRequester?: AnalysisUpdateManyWithoutRequesterNestedInput
    analysesAsProductor?: AnalysisUpdateManyWithoutProductorNestedInput
    analysesValidadas?: AnalysisUpdateManyWithoutValidadoPorNestedInput
  }

  export type UserUncheckedUpdateWithoutCamposProductorInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUncheckedUpdateManyWithoutUserNestedInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedUpdateManyWithoutCreadoPorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedUpdateManyWithoutAsignadoANestedInput
    analysesAsRequester?: AnalysisUncheckedUpdateManyWithoutRequesterNestedInput
    analysesAsProductor?: AnalysisUncheckedUpdateManyWithoutProductorNestedInput
    analysesValidadas?: AnalysisUncheckedUpdateManyWithoutValidadoPorNestedInput
  }

  export type UserCampoUpsertWithWhereUniqueWithoutCampoInput = {
    where: UserCampoWhereUniqueInput
    update: XOR<UserCampoUpdateWithoutCampoInput, UserCampoUncheckedUpdateWithoutCampoInput>
    create: XOR<UserCampoCreateWithoutCampoInput, UserCampoUncheckedCreateWithoutCampoInput>
  }

  export type UserCampoUpdateWithWhereUniqueWithoutCampoInput = {
    where: UserCampoWhereUniqueInput
    data: XOR<UserCampoUpdateWithoutCampoInput, UserCampoUncheckedUpdateWithoutCampoInput>
  }

  export type UserCampoUpdateManyWithWhereWithoutCampoInput = {
    where: UserCampoScalarWhereInput
    data: XOR<UserCampoUpdateManyMutationInput, UserCampoUncheckedUpdateManyWithoutCampoInput>
  }

  export type SolicitudMuestreoUpsertWithWhereUniqueWithoutCampoInput = {
    where: SolicitudMuestreoWhereUniqueInput
    update: XOR<SolicitudMuestreoUpdateWithoutCampoInput, SolicitudMuestreoUncheckedUpdateWithoutCampoInput>
    create: XOR<SolicitudMuestreoCreateWithoutCampoInput, SolicitudMuestreoUncheckedCreateWithoutCampoInput>
  }

  export type SolicitudMuestreoUpdateWithWhereUniqueWithoutCampoInput = {
    where: SolicitudMuestreoWhereUniqueInput
    data: XOR<SolicitudMuestreoUpdateWithoutCampoInput, SolicitudMuestreoUncheckedUpdateWithoutCampoInput>
  }

  export type SolicitudMuestreoUpdateManyWithWhereWithoutCampoInput = {
    where: SolicitudMuestreoScalarWhereInput
    data: XOR<SolicitudMuestreoUpdateManyMutationInput, SolicitudMuestreoUncheckedUpdateManyWithoutCampoInput>
  }

  export type AnalysisUpsertWithWhereUniqueWithoutCampoInput = {
    where: AnalysisWhereUniqueInput
    update: XOR<AnalysisUpdateWithoutCampoInput, AnalysisUncheckedUpdateWithoutCampoInput>
    create: XOR<AnalysisCreateWithoutCampoInput, AnalysisUncheckedCreateWithoutCampoInput>
  }

  export type AnalysisUpdateWithWhereUniqueWithoutCampoInput = {
    where: AnalysisWhereUniqueInput
    data: XOR<AnalysisUpdateWithoutCampoInput, AnalysisUncheckedUpdateWithoutCampoInput>
  }

  export type AnalysisUpdateManyWithWhereWithoutCampoInput = {
    where: AnalysisScalarWhereInput
    data: XOR<AnalysisUpdateManyMutationInput, AnalysisUncheckedUpdateManyWithoutCampoInput>
  }

  export type UserCreateWithoutCamposAsignadosInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposProductor?: CampoCreateNestedManyWithoutProductorInput
    solicitudesCreadas?: SolicitudMuestreoCreateNestedManyWithoutCreadoPorInput
    solicitudesAsignadas?: SolicitudMuestreoCreateNestedManyWithoutAsignadoAInput
    analysesAsRequester?: AnalysisCreateNestedManyWithoutRequesterInput
    analysesAsProductor?: AnalysisCreateNestedManyWithoutProductorInput
    analysesValidadas?: AnalysisCreateNestedManyWithoutValidadoPorInput
  }

  export type UserUncheckedCreateWithoutCamposAsignadosInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposProductor?: CampoUncheckedCreateNestedManyWithoutProductorInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutCreadoPorInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutAsignadoAInput
    analysesAsRequester?: AnalysisUncheckedCreateNestedManyWithoutRequesterInput
    analysesAsProductor?: AnalysisUncheckedCreateNestedManyWithoutProductorInput
    analysesValidadas?: AnalysisUncheckedCreateNestedManyWithoutValidadoPorInput
  }

  export type UserCreateOrConnectWithoutCamposAsignadosInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutCamposAsignadosInput, UserUncheckedCreateWithoutCamposAsignadosInput>
  }

  export type CampoCreateWithoutUsuariosInput = {
    id?: string
    codigoCampo: string
    nombre: string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    productor: UserCreateNestedOneWithoutCamposProductorInput
    solicitudes?: SolicitudMuestreoCreateNestedManyWithoutCampoInput
    analyses?: AnalysisCreateNestedManyWithoutCampoInput
  }

  export type CampoUncheckedCreateWithoutUsuariosInput = {
    id?: string
    codigoCampo: string
    nombre: string
    productorId: string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    solicitudes?: SolicitudMuestreoUncheckedCreateNestedManyWithoutCampoInput
    analyses?: AnalysisUncheckedCreateNestedManyWithoutCampoInput
  }

  export type CampoCreateOrConnectWithoutUsuariosInput = {
    where: CampoWhereUniqueInput
    create: XOR<CampoCreateWithoutUsuariosInput, CampoUncheckedCreateWithoutUsuariosInput>
  }

  export type UserUpsertWithoutCamposAsignadosInput = {
    update: XOR<UserUpdateWithoutCamposAsignadosInput, UserUncheckedUpdateWithoutCamposAsignadosInput>
    create: XOR<UserCreateWithoutCamposAsignadosInput, UserUncheckedCreateWithoutCamposAsignadosInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutCamposAsignadosInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutCamposAsignadosInput, UserUncheckedUpdateWithoutCamposAsignadosInput>
  }

  export type UserUpdateWithoutCamposAsignadosInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposProductor?: CampoUpdateManyWithoutProductorNestedInput
    solicitudesCreadas?: SolicitudMuestreoUpdateManyWithoutCreadoPorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUpdateManyWithoutAsignadoANestedInput
    analysesAsRequester?: AnalysisUpdateManyWithoutRequesterNestedInput
    analysesAsProductor?: AnalysisUpdateManyWithoutProductorNestedInput
    analysesValidadas?: AnalysisUpdateManyWithoutValidadoPorNestedInput
  }

  export type UserUncheckedUpdateWithoutCamposAsignadosInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposProductor?: CampoUncheckedUpdateManyWithoutProductorNestedInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedUpdateManyWithoutCreadoPorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedUpdateManyWithoutAsignadoANestedInput
    analysesAsRequester?: AnalysisUncheckedUpdateManyWithoutRequesterNestedInput
    analysesAsProductor?: AnalysisUncheckedUpdateManyWithoutProductorNestedInput
    analysesValidadas?: AnalysisUncheckedUpdateManyWithoutValidadoPorNestedInput
  }

  export type CampoUpsertWithoutUsuariosInput = {
    update: XOR<CampoUpdateWithoutUsuariosInput, CampoUncheckedUpdateWithoutUsuariosInput>
    create: XOR<CampoCreateWithoutUsuariosInput, CampoUncheckedCreateWithoutUsuariosInput>
    where?: CampoWhereInput
  }

  export type CampoUpdateToOneWithWhereWithoutUsuariosInput = {
    where?: CampoWhereInput
    data: XOR<CampoUpdateWithoutUsuariosInput, CampoUncheckedUpdateWithoutUsuariosInput>
  }

  export type CampoUpdateWithoutUsuariosInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    productor?: UserUpdateOneRequiredWithoutCamposProductorNestedInput
    solicitudes?: SolicitudMuestreoUpdateManyWithoutCampoNestedInput
    analyses?: AnalysisUpdateManyWithoutCampoNestedInput
  }

  export type CampoUncheckedUpdateWithoutUsuariosInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    productorId?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    solicitudes?: SolicitudMuestreoUncheckedUpdateManyWithoutCampoNestedInput
    analyses?: AnalysisUncheckedUpdateManyWithoutCampoNestedInput
  }

  export type UserCreateWithoutSolicitudesCreadasInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoCreateNestedManyWithoutUserInput
    camposProductor?: CampoCreateNestedManyWithoutProductorInput
    solicitudesAsignadas?: SolicitudMuestreoCreateNestedManyWithoutAsignadoAInput
    analysesAsRequester?: AnalysisCreateNestedManyWithoutRequesterInput
    analysesAsProductor?: AnalysisCreateNestedManyWithoutProductorInput
    analysesValidadas?: AnalysisCreateNestedManyWithoutValidadoPorInput
  }

  export type UserUncheckedCreateWithoutSolicitudesCreadasInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoUncheckedCreateNestedManyWithoutUserInput
    camposProductor?: CampoUncheckedCreateNestedManyWithoutProductorInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutAsignadoAInput
    analysesAsRequester?: AnalysisUncheckedCreateNestedManyWithoutRequesterInput
    analysesAsProductor?: AnalysisUncheckedCreateNestedManyWithoutProductorInput
    analysesValidadas?: AnalysisUncheckedCreateNestedManyWithoutValidadoPorInput
  }

  export type UserCreateOrConnectWithoutSolicitudesCreadasInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSolicitudesCreadasInput, UserUncheckedCreateWithoutSolicitudesCreadasInput>
  }

  export type UserCreateWithoutSolicitudesAsignadasInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoCreateNestedManyWithoutUserInput
    camposProductor?: CampoCreateNestedManyWithoutProductorInput
    solicitudesCreadas?: SolicitudMuestreoCreateNestedManyWithoutCreadoPorInput
    analysesAsRequester?: AnalysisCreateNestedManyWithoutRequesterInput
    analysesAsProductor?: AnalysisCreateNestedManyWithoutProductorInput
    analysesValidadas?: AnalysisCreateNestedManyWithoutValidadoPorInput
  }

  export type UserUncheckedCreateWithoutSolicitudesAsignadasInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoUncheckedCreateNestedManyWithoutUserInput
    camposProductor?: CampoUncheckedCreateNestedManyWithoutProductorInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutCreadoPorInput
    analysesAsRequester?: AnalysisUncheckedCreateNestedManyWithoutRequesterInput
    analysesAsProductor?: AnalysisUncheckedCreateNestedManyWithoutProductorInput
    analysesValidadas?: AnalysisUncheckedCreateNestedManyWithoutValidadoPorInput
  }

  export type UserCreateOrConnectWithoutSolicitudesAsignadasInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutSolicitudesAsignadasInput, UserUncheckedCreateWithoutSolicitudesAsignadasInput>
  }

  export type CampoCreateWithoutSolicitudesInput = {
    id?: string
    codigoCampo: string
    nombre: string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    productor: UserCreateNestedOneWithoutCamposProductorInput
    usuarios?: UserCampoCreateNestedManyWithoutCampoInput
    analyses?: AnalysisCreateNestedManyWithoutCampoInput
  }

  export type CampoUncheckedCreateWithoutSolicitudesInput = {
    id?: string
    codigoCampo: string
    nombre: string
    productorId: string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    usuarios?: UserCampoUncheckedCreateNestedManyWithoutCampoInput
    analyses?: AnalysisUncheckedCreateNestedManyWithoutCampoInput
  }

  export type CampoCreateOrConnectWithoutSolicitudesInput = {
    where: CampoWhereUniqueInput
    create: XOR<CampoCreateWithoutSolicitudesInput, CampoUncheckedCreateWithoutSolicitudesInput>
  }

  export type UserUpsertWithoutSolicitudesCreadasInput = {
    update: XOR<UserUpdateWithoutSolicitudesCreadasInput, UserUncheckedUpdateWithoutSolicitudesCreadasInput>
    create: XOR<UserCreateWithoutSolicitudesCreadasInput, UserUncheckedCreateWithoutSolicitudesCreadasInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSolicitudesCreadasInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSolicitudesCreadasInput, UserUncheckedUpdateWithoutSolicitudesCreadasInput>
  }

  export type UserUpdateWithoutSolicitudesCreadasInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUpdateManyWithoutUserNestedInput
    camposProductor?: CampoUpdateManyWithoutProductorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUpdateManyWithoutAsignadoANestedInput
    analysesAsRequester?: AnalysisUpdateManyWithoutRequesterNestedInput
    analysesAsProductor?: AnalysisUpdateManyWithoutProductorNestedInput
    analysesValidadas?: AnalysisUpdateManyWithoutValidadoPorNestedInput
  }

  export type UserUncheckedUpdateWithoutSolicitudesCreadasInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUncheckedUpdateManyWithoutUserNestedInput
    camposProductor?: CampoUncheckedUpdateManyWithoutProductorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedUpdateManyWithoutAsignadoANestedInput
    analysesAsRequester?: AnalysisUncheckedUpdateManyWithoutRequesterNestedInput
    analysesAsProductor?: AnalysisUncheckedUpdateManyWithoutProductorNestedInput
    analysesValidadas?: AnalysisUncheckedUpdateManyWithoutValidadoPorNestedInput
  }

  export type UserUpsertWithoutSolicitudesAsignadasInput = {
    update: XOR<UserUpdateWithoutSolicitudesAsignadasInput, UserUncheckedUpdateWithoutSolicitudesAsignadasInput>
    create: XOR<UserCreateWithoutSolicitudesAsignadasInput, UserUncheckedCreateWithoutSolicitudesAsignadasInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutSolicitudesAsignadasInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutSolicitudesAsignadasInput, UserUncheckedUpdateWithoutSolicitudesAsignadasInput>
  }

  export type UserUpdateWithoutSolicitudesAsignadasInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUpdateManyWithoutUserNestedInput
    camposProductor?: CampoUpdateManyWithoutProductorNestedInput
    solicitudesCreadas?: SolicitudMuestreoUpdateManyWithoutCreadoPorNestedInput
    analysesAsRequester?: AnalysisUpdateManyWithoutRequesterNestedInput
    analysesAsProductor?: AnalysisUpdateManyWithoutProductorNestedInput
    analysesValidadas?: AnalysisUpdateManyWithoutValidadoPorNestedInput
  }

  export type UserUncheckedUpdateWithoutSolicitudesAsignadasInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUncheckedUpdateManyWithoutUserNestedInput
    camposProductor?: CampoUncheckedUpdateManyWithoutProductorNestedInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedUpdateManyWithoutCreadoPorNestedInput
    analysesAsRequester?: AnalysisUncheckedUpdateManyWithoutRequesterNestedInput
    analysesAsProductor?: AnalysisUncheckedUpdateManyWithoutProductorNestedInput
    analysesValidadas?: AnalysisUncheckedUpdateManyWithoutValidadoPorNestedInput
  }

  export type CampoUpsertWithoutSolicitudesInput = {
    update: XOR<CampoUpdateWithoutSolicitudesInput, CampoUncheckedUpdateWithoutSolicitudesInput>
    create: XOR<CampoCreateWithoutSolicitudesInput, CampoUncheckedCreateWithoutSolicitudesInput>
    where?: CampoWhereInput
  }

  export type CampoUpdateToOneWithWhereWithoutSolicitudesInput = {
    where?: CampoWhereInput
    data: XOR<CampoUpdateWithoutSolicitudesInput, CampoUncheckedUpdateWithoutSolicitudesInput>
  }

  export type CampoUpdateWithoutSolicitudesInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    productor?: UserUpdateOneRequiredWithoutCamposProductorNestedInput
    usuarios?: UserCampoUpdateManyWithoutCampoNestedInput
    analyses?: AnalysisUpdateManyWithoutCampoNestedInput
  }

  export type CampoUncheckedUpdateWithoutSolicitudesInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    productorId?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UserCampoUncheckedUpdateManyWithoutCampoNestedInput
    analyses?: AnalysisUncheckedUpdateManyWithoutCampoNestedInput
  }

  export type UserCreateWithoutAnalysesAsRequesterInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoCreateNestedManyWithoutUserInput
    camposProductor?: CampoCreateNestedManyWithoutProductorInput
    solicitudesCreadas?: SolicitudMuestreoCreateNestedManyWithoutCreadoPorInput
    solicitudesAsignadas?: SolicitudMuestreoCreateNestedManyWithoutAsignadoAInput
    analysesAsProductor?: AnalysisCreateNestedManyWithoutProductorInput
    analysesValidadas?: AnalysisCreateNestedManyWithoutValidadoPorInput
  }

  export type UserUncheckedCreateWithoutAnalysesAsRequesterInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoUncheckedCreateNestedManyWithoutUserInput
    camposProductor?: CampoUncheckedCreateNestedManyWithoutProductorInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutCreadoPorInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutAsignadoAInput
    analysesAsProductor?: AnalysisUncheckedCreateNestedManyWithoutProductorInput
    analysesValidadas?: AnalysisUncheckedCreateNestedManyWithoutValidadoPorInput
  }

  export type UserCreateOrConnectWithoutAnalysesAsRequesterInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAnalysesAsRequesterInput, UserUncheckedCreateWithoutAnalysesAsRequesterInput>
  }

  export type UserCreateWithoutAnalysesAsProductorInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoCreateNestedManyWithoutUserInput
    camposProductor?: CampoCreateNestedManyWithoutProductorInput
    solicitudesCreadas?: SolicitudMuestreoCreateNestedManyWithoutCreadoPorInput
    solicitudesAsignadas?: SolicitudMuestreoCreateNestedManyWithoutAsignadoAInput
    analysesAsRequester?: AnalysisCreateNestedManyWithoutRequesterInput
    analysesValidadas?: AnalysisCreateNestedManyWithoutValidadoPorInput
  }

  export type UserUncheckedCreateWithoutAnalysesAsProductorInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoUncheckedCreateNestedManyWithoutUserInput
    camposProductor?: CampoUncheckedCreateNestedManyWithoutProductorInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutCreadoPorInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutAsignadoAInput
    analysesAsRequester?: AnalysisUncheckedCreateNestedManyWithoutRequesterInput
    analysesValidadas?: AnalysisUncheckedCreateNestedManyWithoutValidadoPorInput
  }

  export type UserCreateOrConnectWithoutAnalysesAsProductorInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAnalysesAsProductorInput, UserUncheckedCreateWithoutAnalysesAsProductorInput>
  }

  export type CampoCreateWithoutAnalysesInput = {
    id?: string
    codigoCampo: string
    nombre: string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    productor: UserCreateNestedOneWithoutCamposProductorInput
    usuarios?: UserCampoCreateNestedManyWithoutCampoInput
    solicitudes?: SolicitudMuestreoCreateNestedManyWithoutCampoInput
  }

  export type CampoUncheckedCreateWithoutAnalysesInput = {
    id?: string
    codigoCampo: string
    nombre: string
    productorId: string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
    usuarios?: UserCampoUncheckedCreateNestedManyWithoutCampoInput
    solicitudes?: SolicitudMuestreoUncheckedCreateNestedManyWithoutCampoInput
  }

  export type CampoCreateOrConnectWithoutAnalysesInput = {
    where: CampoWhereUniqueInput
    create: XOR<CampoCreateWithoutAnalysesInput, CampoUncheckedCreateWithoutAnalysesInput>
  }

  export type UserCreateWithoutAnalysesValidadasInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoCreateNestedManyWithoutUserInput
    camposProductor?: CampoCreateNestedManyWithoutProductorInput
    solicitudesCreadas?: SolicitudMuestreoCreateNestedManyWithoutCreadoPorInput
    solicitudesAsignadas?: SolicitudMuestreoCreateNestedManyWithoutAsignadoAInput
    analysesAsRequester?: AnalysisCreateNestedManyWithoutRequesterInput
    analysesAsProductor?: AnalysisCreateNestedManyWithoutProductorInput
  }

  export type UserUncheckedCreateWithoutAnalysesValidadasInput = {
    id?: string
    email: string
    passwordHash: string
    role: $Enums.Role
    fcmToken?: string | null
    firstName?: string | null
    lastName?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    camposAsignados?: UserCampoUncheckedCreateNestedManyWithoutUserInput
    camposProductor?: CampoUncheckedCreateNestedManyWithoutProductorInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutCreadoPorInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedCreateNestedManyWithoutAsignadoAInput
    analysesAsRequester?: AnalysisUncheckedCreateNestedManyWithoutRequesterInput
    analysesAsProductor?: AnalysisUncheckedCreateNestedManyWithoutProductorInput
  }

  export type UserCreateOrConnectWithoutAnalysesValidadasInput = {
    where: UserWhereUniqueInput
    create: XOR<UserCreateWithoutAnalysesValidadasInput, UserUncheckedCreateWithoutAnalysesValidadasInput>
  }

  export type FenologiaEtapaCreateWithoutAnalysisInput = {
    id?: string
    etapa: string
    cantidad: number
    cambiaA: string
    enDias: number
    diasParaCosecha: number
  }

  export type FenologiaEtapaUncheckedCreateWithoutAnalysisInput = {
    id?: string
    etapa: string
    cantidad: number
    cambiaA: string
    enDias: number
    diasParaCosecha: number
  }

  export type FenologiaEtapaCreateOrConnectWithoutAnalysisInput = {
    where: FenologiaEtapaWhereUniqueInput
    create: XOR<FenologiaEtapaCreateWithoutAnalysisInput, FenologiaEtapaUncheckedCreateWithoutAnalysisInput>
  }

  export type FenologiaEtapaCreateManyAnalysisInputEnvelope = {
    data: FenologiaEtapaCreateManyAnalysisInput | FenologiaEtapaCreateManyAnalysisInput[]
    skipDuplicates?: boolean
  }

  export type UserUpsertWithoutAnalysesAsRequesterInput = {
    update: XOR<UserUpdateWithoutAnalysesAsRequesterInput, UserUncheckedUpdateWithoutAnalysesAsRequesterInput>
    create: XOR<UserCreateWithoutAnalysesAsRequesterInput, UserUncheckedCreateWithoutAnalysesAsRequesterInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAnalysesAsRequesterInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAnalysesAsRequesterInput, UserUncheckedUpdateWithoutAnalysesAsRequesterInput>
  }

  export type UserUpdateWithoutAnalysesAsRequesterInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUpdateManyWithoutUserNestedInput
    camposProductor?: CampoUpdateManyWithoutProductorNestedInput
    solicitudesCreadas?: SolicitudMuestreoUpdateManyWithoutCreadoPorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUpdateManyWithoutAsignadoANestedInput
    analysesAsProductor?: AnalysisUpdateManyWithoutProductorNestedInput
    analysesValidadas?: AnalysisUpdateManyWithoutValidadoPorNestedInput
  }

  export type UserUncheckedUpdateWithoutAnalysesAsRequesterInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUncheckedUpdateManyWithoutUserNestedInput
    camposProductor?: CampoUncheckedUpdateManyWithoutProductorNestedInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedUpdateManyWithoutCreadoPorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedUpdateManyWithoutAsignadoANestedInput
    analysesAsProductor?: AnalysisUncheckedUpdateManyWithoutProductorNestedInput
    analysesValidadas?: AnalysisUncheckedUpdateManyWithoutValidadoPorNestedInput
  }

  export type UserUpsertWithoutAnalysesAsProductorInput = {
    update: XOR<UserUpdateWithoutAnalysesAsProductorInput, UserUncheckedUpdateWithoutAnalysesAsProductorInput>
    create: XOR<UserCreateWithoutAnalysesAsProductorInput, UserUncheckedCreateWithoutAnalysesAsProductorInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAnalysesAsProductorInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAnalysesAsProductorInput, UserUncheckedUpdateWithoutAnalysesAsProductorInput>
  }

  export type UserUpdateWithoutAnalysesAsProductorInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUpdateManyWithoutUserNestedInput
    camposProductor?: CampoUpdateManyWithoutProductorNestedInput
    solicitudesCreadas?: SolicitudMuestreoUpdateManyWithoutCreadoPorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUpdateManyWithoutAsignadoANestedInput
    analysesAsRequester?: AnalysisUpdateManyWithoutRequesterNestedInput
    analysesValidadas?: AnalysisUpdateManyWithoutValidadoPorNestedInput
  }

  export type UserUncheckedUpdateWithoutAnalysesAsProductorInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUncheckedUpdateManyWithoutUserNestedInput
    camposProductor?: CampoUncheckedUpdateManyWithoutProductorNestedInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedUpdateManyWithoutCreadoPorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedUpdateManyWithoutAsignadoANestedInput
    analysesAsRequester?: AnalysisUncheckedUpdateManyWithoutRequesterNestedInput
    analysesValidadas?: AnalysisUncheckedUpdateManyWithoutValidadoPorNestedInput
  }

  export type CampoUpsertWithoutAnalysesInput = {
    update: XOR<CampoUpdateWithoutAnalysesInput, CampoUncheckedUpdateWithoutAnalysesInput>
    create: XOR<CampoCreateWithoutAnalysesInput, CampoUncheckedCreateWithoutAnalysesInput>
    where?: CampoWhereInput
  }

  export type CampoUpdateToOneWithWhereWithoutAnalysesInput = {
    where?: CampoWhereInput
    data: XOR<CampoUpdateWithoutAnalysesInput, CampoUncheckedUpdateWithoutAnalysesInput>
  }

  export type CampoUpdateWithoutAnalysesInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    productor?: UserUpdateOneRequiredWithoutCamposProductorNestedInput
    usuarios?: UserCampoUpdateManyWithoutCampoNestedInput
    solicitudes?: SolicitudMuestreoUpdateManyWithoutCampoNestedInput
  }

  export type CampoUncheckedUpdateWithoutAnalysesInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    productorId?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UserCampoUncheckedUpdateManyWithoutCampoNestedInput
    solicitudes?: SolicitudMuestreoUncheckedUpdateManyWithoutCampoNestedInput
  }

  export type UserUpsertWithoutAnalysesValidadasInput = {
    update: XOR<UserUpdateWithoutAnalysesValidadasInput, UserUncheckedUpdateWithoutAnalysesValidadasInput>
    create: XOR<UserCreateWithoutAnalysesValidadasInput, UserUncheckedCreateWithoutAnalysesValidadasInput>
    where?: UserWhereInput
  }

  export type UserUpdateToOneWithWhereWithoutAnalysesValidadasInput = {
    where?: UserWhereInput
    data: XOR<UserUpdateWithoutAnalysesValidadasInput, UserUncheckedUpdateWithoutAnalysesValidadasInput>
  }

  export type UserUpdateWithoutAnalysesValidadasInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUpdateManyWithoutUserNestedInput
    camposProductor?: CampoUpdateManyWithoutProductorNestedInput
    solicitudesCreadas?: SolicitudMuestreoUpdateManyWithoutCreadoPorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUpdateManyWithoutAsignadoANestedInput
    analysesAsRequester?: AnalysisUpdateManyWithoutRequesterNestedInput
    analysesAsProductor?: AnalysisUpdateManyWithoutProductorNestedInput
  }

  export type UserUncheckedUpdateWithoutAnalysesValidadasInput = {
    id?: StringFieldUpdateOperationsInput | string
    email?: StringFieldUpdateOperationsInput | string
    passwordHash?: StringFieldUpdateOperationsInput | string
    role?: EnumRoleFieldUpdateOperationsInput | $Enums.Role
    fcmToken?: NullableStringFieldUpdateOperationsInput | string | null
    firstName?: NullableStringFieldUpdateOperationsInput | string | null
    lastName?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    camposAsignados?: UserCampoUncheckedUpdateManyWithoutUserNestedInput
    camposProductor?: CampoUncheckedUpdateManyWithoutProductorNestedInput
    solicitudesCreadas?: SolicitudMuestreoUncheckedUpdateManyWithoutCreadoPorNestedInput
    solicitudesAsignadas?: SolicitudMuestreoUncheckedUpdateManyWithoutAsignadoANestedInput
    analysesAsRequester?: AnalysisUncheckedUpdateManyWithoutRequesterNestedInput
    analysesAsProductor?: AnalysisUncheckedUpdateManyWithoutProductorNestedInput
  }

  export type FenologiaEtapaUpsertWithWhereUniqueWithoutAnalysisInput = {
    where: FenologiaEtapaWhereUniqueInput
    update: XOR<FenologiaEtapaUpdateWithoutAnalysisInput, FenologiaEtapaUncheckedUpdateWithoutAnalysisInput>
    create: XOR<FenologiaEtapaCreateWithoutAnalysisInput, FenologiaEtapaUncheckedCreateWithoutAnalysisInput>
  }

  export type FenologiaEtapaUpdateWithWhereUniqueWithoutAnalysisInput = {
    where: FenologiaEtapaWhereUniqueInput
    data: XOR<FenologiaEtapaUpdateWithoutAnalysisInput, FenologiaEtapaUncheckedUpdateWithoutAnalysisInput>
  }

  export type FenologiaEtapaUpdateManyWithWhereWithoutAnalysisInput = {
    where: FenologiaEtapaScalarWhereInput
    data: XOR<FenologiaEtapaUpdateManyMutationInput, FenologiaEtapaUncheckedUpdateManyWithoutAnalysisInput>
  }

  export type FenologiaEtapaScalarWhereInput = {
    AND?: FenologiaEtapaScalarWhereInput | FenologiaEtapaScalarWhereInput[]
    OR?: FenologiaEtapaScalarWhereInput[]
    NOT?: FenologiaEtapaScalarWhereInput | FenologiaEtapaScalarWhereInput[]
    id?: UuidFilter<"FenologiaEtapa"> | string
    analysisId?: UuidFilter<"FenologiaEtapa"> | string
    etapa?: StringFilter<"FenologiaEtapa"> | string
    cantidad?: IntFilter<"FenologiaEtapa"> | number
    cambiaA?: StringFilter<"FenologiaEtapa"> | string
    enDias?: IntFilter<"FenologiaEtapa"> | number
    diasParaCosecha?: IntFilter<"FenologiaEtapa"> | number
  }

  export type AnalysisCreateWithoutFenologiaEtapasInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
    requester: UserCreateNestedOneWithoutAnalysesAsRequesterInput
    productor: UserCreateNestedOneWithoutAnalysesAsProductorInput
    campo: CampoCreateNestedOneWithoutAnalysesInput
    validadoPor?: UserCreateNestedOneWithoutAnalysesValidadasInput
  }

  export type AnalysisUncheckedCreateWithoutFenologiaEtapasInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterUserId: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    campoId: string
    productorId: string
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: string | null
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AnalysisCreateOrConnectWithoutFenologiaEtapasInput = {
    where: AnalysisWhereUniqueInput
    create: XOR<AnalysisCreateWithoutFenologiaEtapasInput, AnalysisUncheckedCreateWithoutFenologiaEtapasInput>
  }

  export type AnalysisUpsertWithoutFenologiaEtapasInput = {
    update: XOR<AnalysisUpdateWithoutFenologiaEtapasInput, AnalysisUncheckedUpdateWithoutFenologiaEtapasInput>
    create: XOR<AnalysisCreateWithoutFenologiaEtapasInput, AnalysisUncheckedCreateWithoutFenologiaEtapasInput>
    where?: AnalysisWhereInput
  }

  export type AnalysisUpdateToOneWithWhereWithoutFenologiaEtapasInput = {
    where?: AnalysisWhereInput
    data: XOR<AnalysisUpdateWithoutFenologiaEtapasInput, AnalysisUncheckedUpdateWithoutFenologiaEtapasInput>
  }

  export type AnalysisUpdateWithoutFenologiaEtapasInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    requester?: UserUpdateOneRequiredWithoutAnalysesAsRequesterNestedInput
    productor?: UserUpdateOneRequiredWithoutAnalysesAsProductorNestedInput
    campo?: CampoUpdateOneRequiredWithoutAnalysesNestedInput
    validadoPor?: UserUpdateOneWithoutAnalysesValidadasNestedInput
  }

  export type AnalysisUncheckedUpdateWithoutFenologiaEtapasInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterUserId?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    campoId?: StringFieldUpdateOperationsInput | string
    productorId?: StringFieldUpdateOperationsInput | string
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionCorregidoPorId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCampoCreateManyUserInput = {
    campoId: string
  }

  export type CampoCreateManyProductorInput = {
    id?: string
    codigoCampo: string
    nombre: string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SolicitudMuestreoCreateManyCreadoPorInput = {
    id?: string
    asignadoAId: string
    campoId: string
    mensaje: string
    estado?: $Enums.EstadoSolicitud
    fechaLimite?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type SolicitudMuestreoCreateManyAsignadoAInput = {
    id?: string
    creadoPorId: string
    campoId: string
    mensaje: string
    estado?: $Enums.EstadoSolicitud
    fechaLimite?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AnalysisCreateManyRequesterInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    campoId: string
    productorId: string
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: string | null
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AnalysisCreateManyProductorInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterUserId: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    campoId: string
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: string | null
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AnalysisCreateManyValidadoPorInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterUserId: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    campoId: string
    productorId: string
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserCampoUpdateWithoutUserInput = {
    campo?: CampoUpdateOneRequiredWithoutUsuariosNestedInput
  }

  export type UserCampoUncheckedUpdateWithoutUserInput = {
    campoId?: StringFieldUpdateOperationsInput | string
  }

  export type UserCampoUncheckedUpdateManyWithoutUserInput = {
    campoId?: StringFieldUpdateOperationsInput | string
  }

  export type CampoUpdateWithoutProductorInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UserCampoUpdateManyWithoutCampoNestedInput
    solicitudes?: SolicitudMuestreoUpdateManyWithoutCampoNestedInput
    analyses?: AnalysisUpdateManyWithoutCampoNestedInput
  }

  export type CampoUncheckedUpdateWithoutProductorInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    usuarios?: UserCampoUncheckedUpdateManyWithoutCampoNestedInput
    solicitudes?: SolicitudMuestreoUncheckedUpdateManyWithoutCampoNestedInput
    analyses?: AnalysisUncheckedUpdateManyWithoutCampoNestedInput
  }

  export type CampoUncheckedUpdateManyWithoutProductorInput = {
    id?: StringFieldUpdateOperationsInput | string
    codigoCampo?: StringFieldUpdateOperationsInput | string
    nombre?: StringFieldUpdateOperationsInput | string
    poligonoGps?: NullableJsonNullValueInput | InputJsonValue
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SolicitudMuestreoUpdateWithoutCreadoPorInput = {
    id?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    asignadoA?: UserUpdateOneRequiredWithoutSolicitudesAsignadasNestedInput
    campo?: CampoUpdateOneRequiredWithoutSolicitudesNestedInput
  }

  export type SolicitudMuestreoUncheckedUpdateWithoutCreadoPorInput = {
    id?: StringFieldUpdateOperationsInput | string
    asignadoAId?: StringFieldUpdateOperationsInput | string
    campoId?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SolicitudMuestreoUncheckedUpdateManyWithoutCreadoPorInput = {
    id?: StringFieldUpdateOperationsInput | string
    asignadoAId?: StringFieldUpdateOperationsInput | string
    campoId?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SolicitudMuestreoUpdateWithoutAsignadoAInput = {
    id?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    creadoPor?: UserUpdateOneRequiredWithoutSolicitudesCreadasNestedInput
    campo?: CampoUpdateOneRequiredWithoutSolicitudesNestedInput
  }

  export type SolicitudMuestreoUncheckedUpdateWithoutAsignadoAInput = {
    id?: StringFieldUpdateOperationsInput | string
    creadoPorId?: StringFieldUpdateOperationsInput | string
    campoId?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SolicitudMuestreoUncheckedUpdateManyWithoutAsignadoAInput = {
    id?: StringFieldUpdateOperationsInput | string
    creadoPorId?: StringFieldUpdateOperationsInput | string
    campoId?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AnalysisUpdateWithoutRequesterInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    productor?: UserUpdateOneRequiredWithoutAnalysesAsProductorNestedInput
    campo?: CampoUpdateOneRequiredWithoutAnalysesNestedInput
    validadoPor?: UserUpdateOneWithoutAnalysesValidadasNestedInput
    fenologiaEtapas?: FenologiaEtapaUpdateManyWithoutAnalysisNestedInput
  }

  export type AnalysisUncheckedUpdateWithoutRequesterInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    campoId?: StringFieldUpdateOperationsInput | string
    productorId?: StringFieldUpdateOperationsInput | string
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionCorregidoPorId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    fenologiaEtapas?: FenologiaEtapaUncheckedUpdateManyWithoutAnalysisNestedInput
  }

  export type AnalysisUncheckedUpdateManyWithoutRequesterInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    campoId?: StringFieldUpdateOperationsInput | string
    productorId?: StringFieldUpdateOperationsInput | string
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionCorregidoPorId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AnalysisUpdateWithoutProductorInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    requester?: UserUpdateOneRequiredWithoutAnalysesAsRequesterNestedInput
    campo?: CampoUpdateOneRequiredWithoutAnalysesNestedInput
    validadoPor?: UserUpdateOneWithoutAnalysesValidadasNestedInput
    fenologiaEtapas?: FenologiaEtapaUpdateManyWithoutAnalysisNestedInput
  }

  export type AnalysisUncheckedUpdateWithoutProductorInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterUserId?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    campoId?: StringFieldUpdateOperationsInput | string
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionCorregidoPorId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    fenologiaEtapas?: FenologiaEtapaUncheckedUpdateManyWithoutAnalysisNestedInput
  }

  export type AnalysisUncheckedUpdateManyWithoutProductorInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterUserId?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    campoId?: StringFieldUpdateOperationsInput | string
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionCorregidoPorId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AnalysisUpdateWithoutValidadoPorInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    requester?: UserUpdateOneRequiredWithoutAnalysesAsRequesterNestedInput
    productor?: UserUpdateOneRequiredWithoutAnalysesAsProductorNestedInput
    campo?: CampoUpdateOneRequiredWithoutAnalysesNestedInput
    fenologiaEtapas?: FenologiaEtapaUpdateManyWithoutAnalysisNestedInput
  }

  export type AnalysisUncheckedUpdateWithoutValidadoPorInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterUserId?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    campoId?: StringFieldUpdateOperationsInput | string
    productorId?: StringFieldUpdateOperationsInput | string
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    fenologiaEtapas?: FenologiaEtapaUncheckedUpdateManyWithoutAnalysisNestedInput
  }

  export type AnalysisUncheckedUpdateManyWithoutValidadoPorInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterUserId?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    campoId?: StringFieldUpdateOperationsInput | string
    productorId?: StringFieldUpdateOperationsInput | string
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type UserCampoCreateManyCampoInput = {
    userId: string
  }

  export type SolicitudMuestreoCreateManyCampoInput = {
    id?: string
    creadoPorId: string
    asignadoAId: string
    mensaje: string
    estado?: $Enums.EstadoSolicitud
    fechaLimite?: Date | string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type AnalysisCreateManyCampoInput = {
    id?: string
    imageId: string
    storageKey: string
    requesterUserId: string
    requesterEmail: string
    variedad?: string | null
    fechaAnalisis: Date | string
    totalElementosDetectados: number
    elementosSanos: number
    elementosEnfermos: number
    porcentajeMermaGeneral: number
    pesoSanoGramos: number
    ubicacionLat?: number | null
    ubicacionLng?: number | null
    productorId: string
    offlineSyncId?: string | null
    validacionEstado?: $Enums.EstadoValidacion
    validacionFueCorregido?: boolean
    validacionCorregidoPorId?: string | null
    validacionDiagnosticoOriginal?: string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: string | null
    createdAt?: Date | string
    updatedAt?: Date | string
  }

  export type UserCampoUpdateWithoutCampoInput = {
    user?: UserUpdateOneRequiredWithoutCamposAsignadosNestedInput
  }

  export type UserCampoUncheckedUpdateWithoutCampoInput = {
    userId?: StringFieldUpdateOperationsInput | string
  }

  export type UserCampoUncheckedUpdateManyWithoutCampoInput = {
    userId?: StringFieldUpdateOperationsInput | string
  }

  export type SolicitudMuestreoUpdateWithoutCampoInput = {
    id?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    creadoPor?: UserUpdateOneRequiredWithoutSolicitudesCreadasNestedInput
    asignadoA?: UserUpdateOneRequiredWithoutSolicitudesAsignadasNestedInput
  }

  export type SolicitudMuestreoUncheckedUpdateWithoutCampoInput = {
    id?: StringFieldUpdateOperationsInput | string
    creadoPorId?: StringFieldUpdateOperationsInput | string
    asignadoAId?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type SolicitudMuestreoUncheckedUpdateManyWithoutCampoInput = {
    id?: StringFieldUpdateOperationsInput | string
    creadoPorId?: StringFieldUpdateOperationsInput | string
    asignadoAId?: StringFieldUpdateOperationsInput | string
    mensaje?: StringFieldUpdateOperationsInput | string
    estado?: EnumEstadoSolicitudFieldUpdateOperationsInput | $Enums.EstadoSolicitud
    fechaLimite?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type AnalysisUpdateWithoutCampoInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    requester?: UserUpdateOneRequiredWithoutAnalysesAsRequesterNestedInput
    productor?: UserUpdateOneRequiredWithoutAnalysesAsProductorNestedInput
    validadoPor?: UserUpdateOneWithoutAnalysesValidadasNestedInput
    fenologiaEtapas?: FenologiaEtapaUpdateManyWithoutAnalysisNestedInput
  }

  export type AnalysisUncheckedUpdateWithoutCampoInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterUserId?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    productorId?: StringFieldUpdateOperationsInput | string
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionCorregidoPorId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
    fenologiaEtapas?: FenologiaEtapaUncheckedUpdateManyWithoutAnalysisNestedInput
  }

  export type AnalysisUncheckedUpdateManyWithoutCampoInput = {
    id?: StringFieldUpdateOperationsInput | string
    imageId?: StringFieldUpdateOperationsInput | string
    storageKey?: StringFieldUpdateOperationsInput | string
    requesterUserId?: StringFieldUpdateOperationsInput | string
    requesterEmail?: StringFieldUpdateOperationsInput | string
    variedad?: NullableStringFieldUpdateOperationsInput | string | null
    fechaAnalisis?: DateTimeFieldUpdateOperationsInput | Date | string
    totalElementosDetectados?: IntFieldUpdateOperationsInput | number
    elementosSanos?: IntFieldUpdateOperationsInput | number
    elementosEnfermos?: IntFieldUpdateOperationsInput | number
    porcentajeMermaGeneral?: FloatFieldUpdateOperationsInput | number
    pesoSanoGramos?: FloatFieldUpdateOperationsInput | number
    ubicacionLat?: NullableFloatFieldUpdateOperationsInput | number | null
    ubicacionLng?: NullableFloatFieldUpdateOperationsInput | number | null
    productorId?: StringFieldUpdateOperationsInput | string
    offlineSyncId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionEstado?: EnumEstadoValidacionFieldUpdateOperationsInput | $Enums.EstadoValidacion
    validacionFueCorregido?: BoolFieldUpdateOperationsInput | boolean
    validacionCorregidoPorId?: NullableStringFieldUpdateOperationsInput | string | null
    validacionDiagnosticoOriginal?: NullableStringFieldUpdateOperationsInput | string | null
    validacionCronogramaCorregido?: NullableJsonNullValueInput | InputJsonValue
    validacionObservaciones?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    updatedAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type FenologiaEtapaCreateManyAnalysisInput = {
    id?: string
    etapa: string
    cantidad: number
    cambiaA: string
    enDias: number
    diasParaCosecha: number
  }

  export type FenologiaEtapaUpdateWithoutAnalysisInput = {
    id?: StringFieldUpdateOperationsInput | string
    etapa?: StringFieldUpdateOperationsInput | string
    cantidad?: IntFieldUpdateOperationsInput | number
    cambiaA?: StringFieldUpdateOperationsInput | string
    enDias?: IntFieldUpdateOperationsInput | number
    diasParaCosecha?: IntFieldUpdateOperationsInput | number
  }

  export type FenologiaEtapaUncheckedUpdateWithoutAnalysisInput = {
    id?: StringFieldUpdateOperationsInput | string
    etapa?: StringFieldUpdateOperationsInput | string
    cantidad?: IntFieldUpdateOperationsInput | number
    cambiaA?: StringFieldUpdateOperationsInput | string
    enDias?: IntFieldUpdateOperationsInput | number
    diasParaCosecha?: IntFieldUpdateOperationsInput | number
  }

  export type FenologiaEtapaUncheckedUpdateManyWithoutAnalysisInput = {
    id?: StringFieldUpdateOperationsInput | string
    etapa?: StringFieldUpdateOperationsInput | string
    cantidad?: IntFieldUpdateOperationsInput | number
    cambiaA?: StringFieldUpdateOperationsInput | string
    enDias?: IntFieldUpdateOperationsInput | number
    diasParaCosecha?: IntFieldUpdateOperationsInput | number
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}