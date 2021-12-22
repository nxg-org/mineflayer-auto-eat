<h1 align="center">Welcome to Mineflayer Auto Eat 👋</h1>
<p>
  <img alt="Version" src="https://img.shields.io/badge/version-1.0.4-blue.svg?cacheSeconds=2592000" />
  <img src="https://img.shields.io/badge/node-%3E%3D9.3.0-blue.svg" />
  <a href="https://github.com/kefranabg/readme-md-generator#readme" target="_blank">
    <img alt="Documentation" src="https://img.shields.io/badge/documentation-yes-brightgreen.svg" />
  </a>
  <a href="https://github.com/kefranabg/readme-md-generator/graphs/commit-activity" target="_blank">
    <img alt="Maintenance" src="https://img.shields.io/badge/Maintained%3F-yes-green.svg" />
  </a>
  <a href="https://github.com/nxg-org/mineflayer-auto-eat/blob/master/LICENSE" target="_blank">
    <img alt="License: GPL--3.0" src="https://img.shields.io/github/license/GenerelSchwerz/Mineflayer Auto Eat" />
  </a>
</p>

> An auto-eat plugin for mineflayer bots.

### 🏠 [Homepage](https://github.com/nxg-org/mineflayer-plugins)

## Prerequisites

- node >=9.3.0

## Install

```sh
npm install
```

## Usage

```sh
npm run test
```

## Run tests

```sh
npm run test
```

## Author

👤 **Next-Gen**

* Website: https://github.com/nxg-org/
* GitHub: [@GenerelSchwerz](https://github.com/GenerelSchwerz)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/nxg-org/mineflayer-auto-eat/issues). You can also take a look at the [contributing guide](https://github.com/kefranabg/readme-md-generator/blob/master/CONTRIBUTING.md).

## Show your support

Give a ⭐️ if this project helped you!

## 📝 License

Copyright © 2021 [Next-Gen](https://github.com/GenerelSchwerz).<br />
This project is [GPL--3.0](https://github.com/nxg-org/mineflayer-auto-eat/blob/master/LICENSE) licensed.

***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_











# Lazy readme here.

Look at src/example.ts for basic usage. 

If you wish to manually call the eat function, there are three arguments: 
1. use offhand: boolean | undefined (defaults to false)
2. food to eat: Item | md.Food (minecraft-data Food) | undefined (defaults to false)
    - The function will use the food specified (Item) or find an equivalent Item in its inventory (md.Food), or pick the best food available (undefined)
3. equip old item: boolean | undefined (defaults to false)
