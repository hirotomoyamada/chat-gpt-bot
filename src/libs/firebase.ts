import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import { RuntimeOptions } from 'firebase-functions'
import { UpdateData } from 'firebase-admin/firestore'

admin.initializeApp()

export const location = 'asia-northeast1'
export const runtime: RuntimeOptions = {
  timeoutSeconds: 300,
  memory: '1GB',
}

export const timeZone = 'Asia/Tokyo'

export const firestore = admin.firestore()
export const auth = admin.auth()
export const storage = admin.storage()

export const converter = <T>(): admin.firestore.FirestoreDataConverter<T> => {
  return {
    toFirestore: (modelObject: T) => modelObject as admin.firestore.DocumentData,
    fromFirestore: (
      snapshot: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>,
    ) => snapshot.data() as T,
  }
}

/**
 * Cloud Functions
 */

export type DecodedIdToken = admin.auth.DecodedIdToken
export type CallableContext = functions.https.CallableContext
export type EventContext = functions.EventContext
export type QueryDocumentSnapshot = functions.firestore.QueryDocumentSnapshot

export const onCall = (
  handler: (data: any, context: CallableContext) => any,
): functions.HttpsFunction & functions.Runnable<any> =>
  functions.region(location).runWith(runtime).https.onCall(handler)

export const onRequest = <T>(
  handler: (
    req: functions.https.Request & { body: T },
    res: functions.Response<any>,
  ) => void | Promise<void>,
): functions.HttpsFunction => functions.region(location).runWith(runtime).https.onRequest(handler)

export const onCreateFirestore = (
  path: string,
  handler: (snapshot: QueryDocumentSnapshot, context: EventContext) => any,
): functions.CloudFunction<QueryDocumentSnapshot> =>
  functions.region(location).runWith(runtime).firestore.document(path).onCreate(handler)

export const onDeleteFirestore = (
  path: string,
  handler: (snapshot: QueryDocumentSnapshot, context: EventContext) => any,
): functions.CloudFunction<QueryDocumentSnapshot> =>
  functions.region(location).runWith(runtime).firestore.document(path).onDelete(handler)

export const onUpdateFirestore = (
  path: string,
  handler: (
    change: functions.Change<QueryDocumentSnapshot>,
    context: EventContext,
  ) => functions.CloudFunction<functions.Change<QueryDocumentSnapshot>>,
): functions.CloudFunction<functions.Change<QueryDocumentSnapshot>> =>
  functions.region(location).runWith(runtime).firestore.document(path).onUpdate(handler)

export const onCreateDatabase = (
  path: string,
  handler: (snapshot: functions.database.DataSnapshot, context: functions.EventContext) => any,
): functions.CloudFunction<functions.database.DataSnapshot> =>
  functions.region(location).runWith(runtime).database.ref(path).onCreate(handler)

export const onDeleteDatabase = (
  path: string,
  handler: (snapshot: functions.database.DataSnapshot, context: functions.EventContext) => any,
): functions.CloudFunction<functions.database.DataSnapshot> =>
  functions.region(location).runWith(runtime).database.ref(path).onDelete(handler)

export const onUpdateDatabase = (
  path: string,
  handler: (
    change: functions.Change<functions.database.DataSnapshot>,
    context: functions.EventContext,
  ) => any,
): functions.CloudFunction<functions.Change<functions.database.DataSnapshot>> =>
  functions.region(location).runWith(runtime).database.ref(path).onUpdate(handler)

export const onCreateUser = (
  handler: (user: functions.auth.UserRecord, context: EventContext) => any,
): functions.CloudFunction<functions.auth.UserRecord> =>
  functions.region(location).runWith(runtime).auth.user().onCreate(handler)

export const onDeleteUser = (
  handler: (user: functions.auth.UserRecord, context: EventContext) => any,
): functions.CloudFunction<functions.auth.UserRecord> =>
  functions.region(location).runWith(runtime).auth.user().onDelete(handler)

export const httpsError = (code: functions.https.FunctionsErrorCode, message: string) =>
  new functions.https.HttpsError(code, message)

/**
 * Firestore
 */

export type Firestore = admin.firestore.Firestore
export type database = admin.database.Database
export type CollectionReference<T> = admin.firestore.CollectionReference<T>
export type CollectionGroup<T> = admin.firestore.CollectionGroup<T>
export type DocumentData = admin.firestore.DocumentData
export type DocumentReference<T> = admin.firestore.DocumentReference<T>
export type Query<T> = admin.firestore.Query<T>
export type QuerySnapshot<T> = admin.firestore.QuerySnapshot<T>
export type DocumentSnapshot<T> = admin.firestore.DocumentSnapshot<T>
export type WhereFilterOp = admin.firestore.WhereFilterOp
export type OrderByDirection = admin.firestore.OrderByDirection
export type WriteResult = admin.firestore.WriteResult
export type SetOptions = admin.firestore.SetOptions
export type Precondition = admin.firestore.Precondition
export type FieldValue = admin.firestore.FieldValue

export const getDoc = async <T>(
  _path: string,
): Promise<
  Omit<DocumentSnapshot<T>, 'data'> & {
    data(): T
  }
> => {
  const [path, ...pathSegments] = _path.split('/')

  return (await (
    pathSegments.reduce(
      (prev: CollectionReference<DocumentData> | DocumentReference<DocumentData>, path: string) =>
        'collection' in prev ? prev.collection(path) : prev.doc(path),

      firestore.collection(path),
    ) as DocumentReference<DocumentData>
  )
    .withConverter(converter<T>())
    .get()) as Omit<DocumentSnapshot<T>, 'data'> & { data(): T }
}

export const addDoc = async <T>(_path: string, data: T): Promise<DocumentReference<T>> => {
  const [path, ...pathSegments] = _path.split('/')

  return await (
    pathSegments.reduce(
      (prev: CollectionReference<DocumentData> | DocumentReference<DocumentData>, path: string) =>
        'collection' in prev ? prev.collection(path) : prev.doc(path),

      firestore.collection(path),
    ) as CollectionReference<DocumentData>
  )
    .withConverter(converter<T>())
    .add(data)
}

export const setDoc = async <T>(
  _path: string,
  data: Partial<T>,
  options: SetOptions = { merge: false },
): Promise<WriteResult> => {
  const [path, ...pathSegments] = _path.split('/')

  return await (
    pathSegments.reduce(
      (prev: CollectionReference<DocumentData> | DocumentReference<DocumentData>, path: string) =>
        'collection' in prev ? prev.collection(path) : prev.doc(path),

      firestore.collection(path),
    ) as DocumentReference<DocumentData>
  )
    .withConverter(converter<T>())
    .set(data, options)
}

export const updateDoc = async <T>(_path: string, data: UpdateData<T>): Promise<WriteResult> => {
  const [path, ...pathSegments] = _path.split('/')

  return await (
    pathSegments.reduce(
      (prev: CollectionReference<DocumentData> | DocumentReference<DocumentData>, path: string) =>
        'collection' in prev ? prev.collection(path) : prev.doc(path),

      firestore.collection(path),
    ) as DocumentReference<DocumentData>
  )
    .withConverter(converter<T>())
    .update(data)
}

export const getCollection = async <T>(
  _path: string,
  orderBy?: [keyof T, OrderByDirection],
  where?: [keyof T, WhereFilterOp, any][],
  limit?: number,
): Promise<QuerySnapshot<T>> => {
  const [path, ...pathSegments] = _path.split('/')

  let collection: CollectionReference<T> | Query<T> = (
    pathSegments.reduce(
      (prev: CollectionReference<DocumentData> | DocumentReference<DocumentData>, path: string) =>
        'collection' in prev ? prev.collection(path) : prev.doc(path),

      firestore.collection(path),
    ) as CollectionReference<DocumentData>
  ).withConverter(converter<T>())

  if (where) {
    collection = where.reduce(
      (prev, [fieldPath, opStr, value]) => prev.where(fieldPath as string, opStr, value),
      collection,
    )
  }

  if (orderBy) {
    const [fieldPath, directionStr] = orderBy
    collection = collection.orderBy(fieldPath as string, directionStr)
  }

  if (typeof limit === 'number') {
    collection = collection.limit(limit)
  }

  return await collection.get()
}

export const getCollectionGroup = async <T>(
  path: string,
  orderBy?: [keyof T, OrderByDirection],
  where?: [keyof T, WhereFilterOp, any][],
  limit?: number,
): Promise<QuerySnapshot<T>> => {
  let collectionGroup: CollectionGroup<T> | Query<T> = firestore
    .collectionGroup(path)
    .withConverter(converter<T>())

  if (where) {
    collectionGroup = where.reduce(
      (prev, [fieldPath, opStr, value]) => prev.where(fieldPath as string, opStr, value),
      collectionGroup,
    )
  }

  if (orderBy) {
    const [fieldPath, directionStr] = orderBy
    collectionGroup = collectionGroup.orderBy(fieldPath as string, directionStr)
  }

  if (typeof limit === 'number') {
    collectionGroup = collectionGroup.limit(limit)
  }

  return await collectionGroup.get()
}

export const serverTimestamp = admin.firestore.FieldValue.serverTimestamp
export const Timestamp = admin.firestore.Timestamp

/**
 * RealtimeDatabase
 */
