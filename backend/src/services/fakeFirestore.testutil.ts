// Firestore em memória só pra testes de convite (KAN-124). Transações são
// SERIALIZADAS por um mutex, o que imita o isolamento serializável do
// Firestore: é isso que os testes de concorrência (N aceites, 1 vaga) provam.

type Data = Record<string, any>;

export function createFakeDb() {
  const store = new Map<string, Data>();
  let autoId = 0;
  let lock: Promise<unknown> = Promise.resolve();

  const snapOf = (path: string) => {
    const data = store.get(path);
    return {
      id: path.split('/').pop() as string,
      exists: data !== undefined,
      data: () => (data === undefined ? undefined : structuredCloneSafe(data)),
      ref: docRef(path)
    };
  };

  function structuredCloneSafe(d: Data): Data {
    return { ...d };
  }

  function childrenOf(colPath: string) {
    return [...store.keys()].filter((k) => k.startsWith(colPath + '/') && !k.slice(colPath.length + 1).includes('/'));
  }

  function querySnap(paths: string[]) {
    const docs = paths.map(snapOf);
    return { docs, size: docs.length, empty: docs.length === 0 };
  }

  function colRef(colPath: string): any {
    return {
      path: colPath,
      doc: (id?: string) => docRef(`${colPath}/${id ?? `auto${++autoId}`}`),
      where: (field: string, _op: string, value: unknown) => {
        const q: any = {
          __query: true,
          _limit: Infinity,
          limit(n: number) {
            q._limit = n;
            return q;
          },
          _paths: () => childrenOf(colPath).filter((p) => store.get(p)![field] === value).slice(0, q._limit),
          get: async () => querySnap(q._paths())
        };
        return q;
      },
      limit(n: number) {
        return {
          __query: true,
          _limit: n,
          _paths: () => childrenOf(colPath).slice(0, n),
          get: async () => querySnap(childrenOf(colPath).slice(0, n))
        };
      },
      __col: true,
      _paths: () => childrenOf(colPath),
      get: async () => querySnap(childrenOf(colPath))
    };
  }

  function docRef(path: string): any {
    return {
      path,
      id: path.split('/').pop(),
      collection: (name: string) => colRef(`${path}/${name}`),
      get: async () => snapOf(path),
      set: async (data: Data) => {
        store.set(path, { ...data });
      }
    };
  }

  const isIncrement = (v: any) => v && typeof v === 'object' && v.constructor?.name === 'NumericIncrementTransform';
  void isIncrement;

  function applyWrites(writes: Array<() => void>) {
    writes.forEach((w) => w());
  }

  const db = {
    collection: (name: string) => colRef(name),
    batch: () => {
      const writes: Array<() => void> = [];
      return {
        set(ref: any, data: Data) {
          writes.push(() => store.set(ref.path, { ...data }));
        },
        commit: async () => applyWrites(writes)
      };
    },
    runTransaction: async (fn: (tx: any) => Promise<any>) => {
      const run = async () => {
        const writes: Array<() => void> = [];
        const tx = {
          get: async (target: any) => {
            if (target.__query) return querySnap(target._paths());
            if (target.__col) return querySnap(target._paths());
            return snapOf(target.path);
          },
          set(ref: any, data: Data, opts?: { merge?: boolean }) {
            writes.push(() => store.set(ref.path, opts?.merge ? { ...(store.get(ref.path) ?? {}), ...data } : { ...data }));
          },
          update(ref: any, data: Data) {
            writes.push(() => {
              if (!store.has(ref.path)) throw new Error('update em doc inexistente');
              store.set(ref.path, { ...store.get(ref.path)!, ...data });
            });
          }
        };
        const result = await fn(tx);
        applyWrites(writes);
        return result;
      };
      const next = lock.then(run, run);
      lock = next.catch(() => undefined);
      return next;
    }
  };

  return { db, store };
}
