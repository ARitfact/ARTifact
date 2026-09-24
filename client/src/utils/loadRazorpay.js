let razorpayScriptPromise = null;

const loadRazorpay = () => {
  /*
   * Script already loaded.
   */
  if (window.Razorpay) {
    return Promise.resolve(true);
  }

  /*
   * Multiple button clicks should not
   * inject the script multiple times.
   */
  if (razorpayScriptPromise) {
    return razorpayScriptPromise;
  }

  razorpayScriptPromise =
    new Promise((resolve) => {
      const existingScript =
        document.querySelector(
          'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
        );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          () => resolve(true),
          {
            once: true,
          }
        );

        existingScript.addEventListener(
          "error",
          () => resolve(false),
          {
            once: true,
          }
        );

        return;
      }

      const script =
        document.createElement(
          "script"
        );

      script.src =
        "https://checkout.razorpay.com/v1/checkout.js";

      script.async = true;

      script.onload = () => {
        resolve(true);
      };

      script.onerror = () => {
        /*
         * Allow a later retry after
         * network failure.
         */
        razorpayScriptPromise =
          null;

        resolve(false);
      };

      document.body.appendChild(
        script
      );
    });

  return razorpayScriptPromise;
};

export default loadRazorpay;