declare namespace Coachee {

  interface IConnectionObject {
    promise: Promise<any>;
    destroy: () => {};
  }

  interface IChildConnectionObject extends IConnectionObject {
    iframe: HTMLIFrameElement;
  }

  type ConnectionMethods<T> = {
    [P in keyof T]: () => Promise<any>;
  };

  type ERR_CONNECTION_DESTROYED = 'ConnectionDestroyed';
  type ERR_CONNECTION_TIMEOUT = 'ConnectionTimeout';
  type ERR_NOT_IN_IFRAME = 'NotInIframe';

  interface IConnectionOptions {
    methods?: ConnectionMethods<{}>;
    timeout?: number;
  }

  interface IChildConnectionOptions extends IConnectionOptions {
    url: string;
    appendTo?: HTMLElement;
    iframe?: HTMLElement;
  }

  interface IParentConnectionOptions extends IConnectionOptions {
    parentOrigin?: string;
  }

  interface CoacheeStatic {
    connectToChild(options: IChildConnectionOptions): IChildConnectionObject;
    connectToParent(options?: IParentConnectionOptions): IConnectionObject;
    Promise: typeof Promise;
    debug: boolean;
    ERR_CONNECTION_DESTROYED: ERR_CONNECTION_DESTROYED;
    ERR_CONNECTION_TIMEOUT: ERR_CONNECTION_TIMEOUT;
    ERR_NOT_IN_IFRAME: ERR_NOT_IN_IFRAME;
  }
}

declare module 'coachee' {
  const Coachee: Coachee.CoacheeStatic;
  export default Coachee;
  export const ERR_CONNECTION_DESTROYED: Coachee.ERR_CONNECTION_DESTROYED;
  export const ERR_CONNECTION_TIMEOUT: Coachee.ERR_CONNECTION_TIMEOUT;
  export const ERR_NOT_IN_IFRAME: Coachee.ERR_NOT_IN_IFRAME;
}
