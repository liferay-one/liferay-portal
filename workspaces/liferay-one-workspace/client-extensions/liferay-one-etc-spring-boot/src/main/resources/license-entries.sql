SELECT
  CONCAT_WS(
    ',', productKey, name, type_, IFNULL(versionMin, ''),
    IFNULL(versionMax, ''))
FROM Provisioning_LicenseEntry
ORDER BY productKey, type_, name;
