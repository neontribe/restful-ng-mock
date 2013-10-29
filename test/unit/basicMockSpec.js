'use strict';

describe('basicMock', function () {
  beforeEach(module('restfulNgMock'));

  var basicMock, $http, $httpBackend;
  beforeEach(inject(function(_basicMock_, _$http_, _$httpBackend_) {
    basicMock = _basicMock_;
    $http = _$http_;
    $httpBackend = _$httpBackend_;
    setupGrabHttpResult($httpBackend);
  }));

  it('is chainable with setOptions', function () {
    var m = basicMock("/foo");
    expect(m.setOptions({
      debug: true
    })).toEqual(m);
  });

  describe('when used incorrectly', function () {
    it('fails when given template URL without starting slash', function () {
      expect(function() {
        basicMock("foo");
      }).toThrow();
    });

    it('fails when given template URL with closing slash', function () {
      expect(function() {
        basicMock("/foo/");
      }).toThrow();
    });

    it('fails when given template URL with invalid character', function () {
      expect(function() {
        basicMock("/fo&o");
      }).toThrow();
    });

    it('fails when given invalid options to setOptions', function () {
      var m = basicMock("/foo");
      expect(function() {
        m.setOptions({noSuchOption: 123});
      }).toThrow();
    });
  });

  describe('instance', function () {
    var mock;
    beforeEach(function() {
      mock = basicMock('/foo');
      mock.route('GET', '', function () {
        return { foo: 'narf' };
      });
      mock.route('GET', '/bar/?', function (params) {
        return { foo: 'bar' + params[0] };
      });
      mock.route('GET', '/tripleParam', function (params, method, url) {
        return { product: parseInt(url.param('number')) * 3 };
      });
      mock.route('POST', '/doubleJson', function (params, method, url, reqData) {
        return { product: reqData.number * 2 };
      });
      mock.route('POST', '/quadrupleRaw', function (params, method, url, reqData) {
        return { product: parseInt(reqData) * 4 };
      });
      mock.route('POST', '/fail', function () {
        return new this.HttpError(400, "Nope.");
      });
    });

    it('responds on simple routes', function () {
      grabHttpResult($http.get('/foo'));
      expect(result.status).toEqual(200);
      expect(result.data).toEqual({ foo: 'narf' });
    });

    it('responds on parameterized routes', function () {
      grabHttpResult($http.get('/foo/bar/123'));
      expect(result.status).toEqual(200);
      expect(result.data).toEqual({ foo: 'bar123' });
    });

    it('correctly handles error responses', function () {
      grabHttpResult($http.post('/foo/fail'));
      expect(result.status).toEqual(400);
      expect(result.data).toEqual({ code: 400, message: 'Nope.' });
    });

    it('accepts query parameters', function () {
      grabHttpResult($http.get('/foo/tripleParam?number=5'));
      expect(result.data).toEqual({ product: 15 });
    });

    it('accepts JSON data and parses it for handler function', function () {
      grabHttpResult($http.post('/foo/doubleJson', { number: 3 }));
      expect(result.data).toEqual({ product: 6 });
    });

    it('accepts string data and passes it through to handler function', function () {
      grabHttpResult($http.post('/foo/quadrupleRaw', "20"));
      expect(result.data).toEqual({ product: 80 });
    });

    describe('with response info inclusion enabled', function () {
      beforeEach(function() {
        mock.setOptions({httpResponseInfoLabel: 'response'});
      });

      it('includes response info in normal responses', function () {
        grabHttpResult($http.get('/foo'));
        expect(result.status).toEqual(200);
        expect(result.data).toEqual({ foo: 'narf', response: { code: 200, message: 'OK' }});
      });

      it('encapsulates resposne info in error responses', function () {
        grabHttpResult($http.post('/foo/fail'));
        expect(result.status).toEqual(400);
        expect(result.data).toEqual({ response: { code: 400, message: 'Nope.' } });
      });
    });

    it('is not confused by URL query parameters', function () {
      grabHttpResult($http.get('/foo/bar/54?narf=bork'));
      expect(result.data).toEqual({ foo: 'bar54' });
    });

    it('is not confused by URL query parameters with encoded symbols', function () {
      grabHttpResult($http.get('/foo/bar/53?narf=bork@example.com'));
      expect(result.data).toEqual({ foo: 'bar53' });
    });

    it('fails when route is given non-blank URL without starting slash', function () {
      expect(function() {
        mock.route('GET', "foo", function() {});
      }).toThrow();
    });

    it('fails when route is given URL with closing slash', function () {
      expect(function() {
        mock.route('GET', "/foo/", function() {});
      }).toThrow();
    });

    describe('with debug mode enabled with a simple boolean flag', function () {
      beforeEach(function() {
        mock.setOptions({
          debug: true
        });

        spyOn(console, 'log');
      });

      it('outputs information about requests to console.log', function () {
        grabHttpResult($http.get('/foo/bar/99'));
        expect(console.log).toHaveBeenCalledWith([
          jasmine.any(String), // timestamp
          '>>> GET /foo/bar/99',
          '<<< 200',
          { foo: 'bar99' }
        ]);
      });
    });

    describe('with debug mode enabled with a custom function', function () {
      var debugSpy;
      beforeEach(function() {
        debugSpy = jasmine.createSpy('debugSpy');
        mock.setOptions({
          debug: debugSpy
        });
      });

      it('calls the function with request and response info', function () {
        grabHttpResult($http.get('/foo/bar/89'));
        expect(debugSpy).toHaveBeenCalledWith(
          'GET',
          '/foo/bar/89',
          undefined,
          jasmine.any(Object),
          200,
          { foo: 'bar89' }
        );
      });
    });

  });
});
