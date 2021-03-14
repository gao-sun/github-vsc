# Port Forwarding

This tutorial will use `create-react-app` as the example and assume you have started a remote sesion. Other apps are similar.

Inside GitHub VSC terminal:

```bash
yarn create react-app my-app
cd my-app
yarn start
```

When you see something like:

```bash
Compiled successfully!

You can now view my-app in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://10.1.0.4:3000

Note that the development build is not optimized.
To create a production build, use yarn build.
```

Then open the control panel in GitHub VSC, click "Enable" under port forwarding section, and change the port number to 3000:

![port-forwarding](https://user-images.githubusercontent.com/14722250/111059321-ac5ffa80-84cf-11eb-9f26-a933675d1cd8.png)

And you are all set. Click the link to see the result:

![port-forwarding-result](https://user-images.githubusercontent.com/14722250/111059362-f8ab3a80-84cf-11eb-9809-c5f4d4ef1fc8.png)