const CHILD_SERVER = `http://${window.location.hostname}:9000`;

describe('Coachee', () => {
  beforeAll(() => {
    Coachee.Promise = RSVP.Promise;
    Coachee.debug = false; // Set to true when debugging tests.
  });

  it('completes a handshake', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`
    });

    connection.promise.then(() => {
      connection.destroy();
      done();
    });
  });

  it('creates an iframe and add it to document.body', () => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`
    });

    expect(connection.iframe).toBeDefined();
    expect(connection.iframe.src).toBe(`${CHILD_SERVER}/child.html`);
    expect(connection.iframe.parentNode).toBe(document.body);
  });

  it('creates an iframe and add it to a specific element', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`,
      appendTo: container
    });

    expect(connection.iframe).toBeDefined();
    expect(connection.iframe.src).toBe(`${CHILD_SERVER}/child.html`);
    expect(connection.iframe.parentNode).toBe(container);
  });

  it('calls a function on the child', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`
    });

    connection.promise.then((child) => {
      child.multiply(2, 5).then((value) => {
        expect(value).toEqual(10);
        connection.destroy();
        done();
      });
    });
  });
  
  it('calls a function on the child with origin set', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/childOrigin.html`
    });

    connection.promise.then((child) => {
      child.multiply(2, 5).then((value) => {
        expect(value).toEqual(10);
        connection.destroy();
        done();
      });
    });
  });

  it('calls an asynchronous function on the child', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`
    });

    connection.promise.then((child) => {
      child.multiplyAsync(2, 5).then((value) => {
        expect(value).toEqual(10);
        connection.destroy();
        done();
      });
    });
  });

  it('calls a function on the parent', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`,
      methods: {
        add: (num1, num2) => {
          return num1 + num2;
        }
      }
    });

    connection.promise.then((child) => {
      child.addUsingParent().then(() => {
        child.getParentReturnValue().then((value) => {
          expect(value).toEqual(9);
          connection.destroy();
          done();
        });
      });
    });
  });

  it('handles promises rejected with strings', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`,
    });

    connection.promise.then((child) => {
      child.getRejectedPromiseString().catch((error) => {
        expect(error).toBe('test error string');
        connection.destroy();
        done();
      });
    });
  });

  it('handles promises rejected with error objects', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`,
    });

    connection.promise.then((child) => {
      child.getRejectedPromiseError().catch((error) => {
        expect(error).toEqual(jasmine.any(Error));
        expect(error.name).toBe('TypeError');
        expect(error.message).toBe('test error object');
        // In IE, errors only get `stack` set when an error is raised. In this test case, the
        // promise rejected with the error and never raised, so no stack.
        // expect(error.stack).toEqual(jasmine.any(String));
        connection.destroy();
        done();
      });
    });
  });

  it('handles thrown errors', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`,
    });

    connection.promise.then((child) => {
      child.throwError().catch((error) => {
        expect(error).toEqual(jasmine.any(Error));
        expect(error.message).toBe('Oh nos!');
        connection.destroy();
        done();
      });
    });
  });

  it('handles unclonable values', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`,
    });

    connection.promise.then((child) => {
      child.getUnclonableValue().catch((error) => {
        expect(error).toEqual(jasmine.any(Error));
        expect(error.name).toBe('DataCloneError');
        connection.destroy();
        done();
      });
    });
  });

  it('doesn\'t connect to iframe connecting to parent with different origin', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/childDiffOrigin.html`
    });

    const spy = jasmine.createSpy();

    connection.promise.then(spy);

    connection.iframe.addEventListener('load', function() {
      // Give Coachee time to try to make a handshake.
      setTimeout(() => {
        expect(spy).not.toHaveBeenCalled();
        done();
      }, 100);
    });
  });

  it('reconnects after child reloads', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`
    });

    connection.promise.then((child) => {
      const previousMultiply = child.multiply;

      const intervalId = setInterval(function() {
        // Detect reconnection
        if (child.multiply !== previousMultiply) {
          clearInterval(intervalId);
          child.multiply(2, 4).then((value) => {
            expect(value).toEqual(8);
            connection.destroy();
            done();
          });
        }
      }, 10);

      child.reload();
    });
  });

  // Issue #18
  it('properly disconnects previous call receiver upon reconnection', (done) => {
    const add = jasmine.createSpy().and.callFake((num1, num2) => {
      return num1 + num2;
    });

    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`,
      methods: {
        add
      }
    });

    connection.promise.then((child) => {
      const previousAddUsingParent = child.addUsingParent;

      const intervalId = setInterval(function() {
        // Detect reconnection
        if (child.addUsingParent !== previousAddUsingParent) {
          clearInterval(intervalId);
          child.addUsingParent().then(() => {
            expect(add.calls.count()).toEqual(1);
            connection.destroy();
            done();
          });
        }
      }, 10);

      child.reload();
    });
  });

  it('reconnects after child navigates to other page with different methods', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`
    });

    connection.promise.then((child) => {
      const intervalId = setInterval(function() {
        // Detect reconnection
        if (child.divide) {
          clearInterval(intervalId);
          expect(child.multiply).not.toBeDefined();
          child.divide(6, 3).then((value) => {
            expect(value).toEqual(2);
            connection.destroy();
            done();
          });
        }
      }, 10);

      child.navigate();
    });
  });

  it('rejects promise if connectToChild times out', (done) => {
    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`,
      timeout: 0
    });

    connection.promise.catch((error) => {
      expect(error).toEqual(jasmine.any(Error));
      expect(error.message).toBe('Connection to child timed out after 0ms');
      expect(error.code).toBe(Coachee.ERR_CONNECTION_TIMEOUT);
      done();
    });
  });

  it('doesn\'t destroy connection if connection succeeds then ' +
    'timeout passes (connectToChild)', (done) => {
    jasmine.clock().install();

    const connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/child.html`,
      timeout: 100000
    });

    connection.promise.then(() => {
      jasmine.clock().tick(100001);

      expect(connection.iframe.parentNode).not.toBeNull();

      jasmine.clock().uninstall();
      connection.destroy();
      done();
    });
  });

  it('doesn\'t destroy connection if connection succeeds then ' +
    'timeout passes (connectToParent)', (done) => {

    var connection = Coachee.connectToChild({
      url: `${CHILD_SERVER}/childTimeoutAfterSucceeded.html`,
      methods: {
        reportStillConnected() {
          connection.destroy();
          done();
        }
      }
    });
  });

  it('rejects promise if connectToParent times out', (done) => {
    const connection = Coachee.connectToParent({
      timeout: 0
    });

    connection.promise.catch((error) => {
      expect(error).toEqual(jasmine.any(Error));
      expect(error.message).toBe('Connection to parent timed out after 0ms');
      expect(error.code).toBe(Coachee.ERR_CONNECTION_TIMEOUT);
      connection.destroy();
      done();
    });
  });

  describe('destroy', () => {
    it('removes iframe from its parent', (done) => {
      const connection = Coachee.connectToChild({
        url: `${CHILD_SERVER}/child.html`
      });

      connection.destroy();

      expect(connection.iframe.parentNode).toBeNull();
      done();
    });

    it('rejects promise', (done) => {
      const connection = Coachee.connectToChild({
        url: `${CHILD_SERVER}/child.html`
      });

      connection.promise.catch((error) => {
        expect(error).toEqual(jasmine.any(Error));
        expect(error.message).toBe('Connection destroyed');
        expect(error.code).toBe(Coachee.ERR_CONNECTION_DESTROYED);
        done();
      });

      connection.destroy();
    });

    // When this test runs in IE, we get an "Object Expected" error within the iframe due to the
    // Array constructor not existing. It appears that when we call connection.destroy(), which
    // removes the iframe, IE messes up the Array constructor within the detached iframe.
    it('removes handshake message listener', (done) => {
      spyOn(window, 'addEventListener').and.callThrough();
      spyOn(window, 'removeEventListener').and.callThrough();

      const connection = Coachee.connectToChild({
        url: `${CHILD_SERVER}/child.html`
      });


      // The handshake message listener is set up immediately after the iframe has loaded.
      connection.iframe.addEventListener('load', () => {
        connection.destroy();

        window.addEventListener.calls.allArgs().forEach(args => {
          expect(window.removeEventListener).toHaveBeenCalledWith(...args);
        });

        done();
      });
    });

    it('removes method call message listeners', (done) => {
      spyOn(window, 'addEventListener').and.callThrough();
      spyOn(window, 'removeEventListener').and.callThrough();

      const connection = Coachee.connectToChild({
        url: `${CHILD_SERVER}/child.html`
      });

      // The method call message listener is set up after the connection has been established.
      connection.promise.then(() => {
        connection.destroy();

        window.addEventListener.calls.allArgs().forEach(args => {
          expect(window.removeEventListener).toHaveBeenCalledWith(...args);
        });

        done();
      });
    });

    it('prevents method calls from being sent', (done) => {
      const connection = Coachee.connectToChild({
        url: `${CHILD_SERVER}/child.html`
      });

      // The method call message listener is set up after the connection has been established.
      connection.promise.then((child) => {
        connection.destroy();

        try {
          child.multiply();
        } catch (error) {
          expect(error).toEqual(jasmine.any(Error));
          expect(error.message).toBe('Unable to send multiply() call due to destroyed connection');
          expect(error.code).toBe(Coachee.ERR_CONNECTION_DESTROYED);
          done();
        }
      });
    });

    it('supports multiple connections', (done) => {
      const connection1 = Coachee.connectToChild({
        url: `${CHILD_SERVER}/child.html`
      });
      const connection2 = Coachee.connectToChild({
        url: `${CHILD_SERVER}/child.html`
      });

      RSVP.all([
        connection1.promise.then((child) => {
          return child.multiplyAsync(2, 5).then((value) => {
            expect(value).toEqual(10);
            connection1.destroy();
          });
        }),
        connection2.promise.then((child) => {
          return child.multiplyAsync(3, 5).then((value) => {
            expect(value).toEqual(15);
            connection2.destroy();
          });
        })
      ]).then(done);
    });
  });
});
