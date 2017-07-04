exports = module.exports = function(oobChallenge, Authenticators, issueToken, authenticator, authenticateToken, Tokens) {
  
  function resumeSession(req, res, next) {
    Tokens.decipher(req.body.mfa_token, function(err, claims, issuer) {
      if (err) { return next(err); }
      
      // FIXME: Put this back
      /*
      authenticateToken(claims.subject, issuer, function(err, user) {
        if (err) { return next(err); }
        // TODO: 404, if no user
        
        req.client = req.user;
        req.user = user;
        next();
      });
      */
      
      req.user = { id: '1' }
      next();
    });
  }
  
  
  function list(req, res, next) {
    // TODO: Pass the user record here.
    Authenticators.list(req.user, function(err, authenticators) {
      if (err) { return next(err); }
      res.locals.authenticators = authenticators;
      
      if (!authenticators || authenticators.length == 0 || authenticators[0].active === false) {
        // TODO: Make this a better error.
        res.json({ error: 'enrollment_required' });
        return;
      }
      
      next();
    });
  }
  
  function respond(req, res, next) {
    // TODO: Strip an private properties prefixed by underscore
    
    console.log('CONTINUE MFA!');
    console.log(res.locals.authenticators);
    
    
    var authnr = res.locals.authenticators[0];
    if (authnr.type.indexOf('oob') != -1) {
      
      oobChallenge(authnr, function(err, params) {
        if (err) { return next(err); }
      
        params.type = 'oob';
        res.locals.params = params;
        res.locals.code = params.transactionID || '1234';
        next();
      });
      
    } else if (authnr.type.indexOf('otp') != -1) {
      // TODO:
    }
    
    /*
    challenge(authnr, function(err, params, ctx) {
      if (err) { return next(err); }
      
      params = params || { type: 'otp' };
      ctx = ctx || {};
      
      res.locals.params = params;
      res.locals.code = params.transactionID || '1234';
      next();
    });
    */
    
    //res.json({
    //  credentials: res.locals.credentials
    //});
  }
  
  function genOOBCode(req, res, next) {
    var params = res.locals.params;
    
    if (params.type == 'oob') {
      console.log('MUST GEN OOB CODE!');
      
      console.log(res.locals.params);
      console.log(res.locals.code);
      
      
      var ctx = {};
      // TODO: Remove these, hash with MFA token
      ctx.user = req.user;
      ctx.client = req.user;
      ctx.audience = [ {
        id: 'http://localhost/token',
        //secret: 'some-shared-with-rs-s3cr1t-asdfasdfaieraadsfiasdfasd'
        secret: 'some-secret-shared-with-oauth-authorization-server'
      } ];
      ctx.challenge = {
        method: 'authn',
        authenticator: res.locals.authenticators[0],
        transactionID: res.locals.code
      }
      
      issueToken(ctx, { dialect: 'http://schemas.authnomicon.org/tokens/jwt/mfa-oob-code' }, function(err, oobCode) {
        if (err) { return next(err); }

        res.locals.code = oobCode;
        next();
      });
      
    } else {
      next();
    }
  }
  
  function respond2(req, res, next) {
    var params = res.locals.params;
    
    var body = {}
    body.challenge_type = params.type;
    
    switch (params.type) {
    case 'otp':
      break;
    case 'oob':
      body.oob_code = res.locals.code;
      if (params.binding) {
        body.binding_method = params.binding.method;
      }
      break;
    }
    
    
    console.log('RESPOND WITH CHALLENGE:');
    console.log(body);
    
    res.json(body);
  }


  return [
    require('body-parser').urlencoded({ extended: false }),
    authenticator.authenticate(['client_secret_basic', 'client_secret_post', 'none'], { session: false, failWithError: true }),
    resumeSession,
    list,
    respond,
    genOOBCode,
    respond2
  ];
  
};

exports['@require'] = [
  //'http://schemas.authnomicon.org/js/login/mfa/opt/auth0/challenge',
  'http://schemas.authnomicon.org/js/security/authentication/oob/challenge',
  'http://schemas.authnomicon.org/js/login/mfa/opt/auth0/UserAuthenticatorsDirectory',
  'http://schemas.authnomicon.org/js/aaa/oauth2/util/issueToken',
  'http://i.bixbyjs.org/http/Authenticator',
  'http://i.bixbyjs.org/security/authentication/token/authenticate',
  'http://i.bixbyjs.org/tokens'
  //'http://schemas.authnomicon.org/js/login/mfa/opt/duo/CredentialDirectory'
  //'http://schemas.authnomicon.org/js/login/mfa/opt/auth0/UserAuthenticatorsDirectory'
];
