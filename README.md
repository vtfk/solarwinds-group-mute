# [WiP] Group Muter Solarwinds
This is a script and APM template for muting Nodes under a group in Solarwinds.

<!--
## Download
You can download the template from the [releases page](/releases) under assets.
-->

## Process flow
![assets/Solarwinds-mute-groups.png](assets/Solarwinds-mute-groups.png)

## Resources
### API Documentation
[Solarwinds Github Wiki](https://github.com/solarwinds/OrionSDK/wiki/REST)

### Endpoints used
`{{SW_BASE_URL}}/SolarWinds/InformationService/v3/Json/Invoke/Orion.AlertSuppression/GetAlertSuppressionState`

`{{SW_BASE_URL}}/SolarWinds/InformationService/v3/Json/Invoke/Orion.AlertSuppression/SuppressAlerts`

`{{SW_BASE_URL}}/SolarWinds/InformationService/v3/Json/Invoke/Orion.AlertSuppression/ResumeAlerts`

`{{SW_BASE_URL}}/SolarWinds/InformationService/v3/Json/Query`

## License
[MIT](LICENSE)