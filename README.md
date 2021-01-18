# Group Muter Solarwinds
This is a script which automatically mutes entities under all muted groups. Supports having manually muted nodes untouched by using a custom property on a node.

## Table of contents
- [Prerequisites](#Prerequisites)
- [Download](#Download)
- [Configuration](#Configuration)
- [Process flow](#Process-flow)
- [Development & building](#Development-&-building)
- [Resources](#Resources)
- [License](#License)

## Prerequisites
- [X] Somewhere to run this script periodically (cron, Windows task scheduler, etc.)
- [X] A local Solarwinds account with permissions:
  - [X] `Allow Node Management Rights` set to Yes
  - [X] `Allow Account to Unmanage Objects & Mute Alerts` set to Yes

<!-- TODO: Create Github Action to compile a binary of the script -->
## Download
You can download the binary from the [releases page](/releases) under assets.

## Configuration
Edit the [template.env](./template.env) file to reflect your environment.

### `NODE_TLS_REJECT_UNAUTHORIZED = 1`
If you are using self-signed cerificates, you can set this to `0`. 

**Use at your own risk, this diasbles the certificate validation check.  
While the traffic is still encrypted, the certificate can be forged.**
### `SW_BASE_URL = https://solarwinds.example.com:17778`
The base URL to the Solarwinds server, including the port number.
### `SW_GROUP_MUTER_USERNAME = api`
The username of the API account.
### `SW_GROUP_MUTER_PASSWORD = MyStrongPassword`
The password of the API account.

### `SW_USE_CUSTOM_PROPERTY = true`
If true; the script will check all nodes (not components), if they have a custom property with the specified name in `SW_CUSTOM_PROPERTY_NAME`.

The script will set this property to `true` ("Yes" in SW) when it mutes a node and `false` ("No" in SW) when it unmutes.

If the property is false and the node should be unmuted (Node is muted, group is not). Then it will ignore the node as it is probably muted manually by a person.

If you want to make sure this script manages all nodes:
1. Disable this setting.
2. Run the script.
3. Enable this setting.

### `SW_CUSTOM_PROPERTY_NAME = _Muted_By_Script`
The custom property name.

## Process flow
![assets/Solarwinds-mute-groups.png](assets/Solarwinds-mute-groups.png)
> TODO: Update flow iamge. It's the same result, just a different process to get that result.

## Development & building
```sh
# Clone and install dependencies
git clone https://github.com/vtfk/solarwinds-group-mute
cd solarwinds-group-mute
npm install

# Run TS script
npm run dev

# Run tsc
npm run build

# Run pkg to build the binaries
# This will build a binary for: linux, macos, windows. On your current node version and arch.
npm run build:bin
# To build for a specific NodeVer/platform/arch use the --targets option
# Read more here: https://github.com/vercel/pkg#Targets
# Examples:
npm run build:bin -- --targets linux
npm run build:bin -- --targets node12-linux-x64
```

## Resources
### API Documentation
[Solarwinds Github Wiki](https://github.com/solarwinds/OrionSDK/wiki/REST)

### Endpoints used
`{{SW_BASE_URL}}/SolarWinds/InformationService/v3/Json/Query`

`{{SW_BASE_URL}}/SolarWinds/InformationService/v3/Json/Invoke/Orion.AlertSuppression/SuppressAlerts`

`{{SW_BASE_URL}}/SolarWinds/InformationService/v3/Json/Invoke/Orion.AlertSuppression/ResumeAlerts`

## License
[MIT](LICENSE)
