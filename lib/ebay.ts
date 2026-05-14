import fs from 'fs';
import path from 'path';

export const escapeXml = (unsafe: string | null | undefined) => {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

export async function uploadImageToEbay(token: string, relativePath: string): Promise<string> {
  const filePath = path.join(process.cwd(), 'public', relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Image file not found: ${relativePath}`);
  }

  const boundary = '----eBayBoundary' + Date.now();
  const imageBuffer = fs.readFileSync(filePath);
  
  const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<UploadSiteHostedPicturesRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${escapeXml(token)}</eBayAuthToken>
  </RequesterCredentials>
</UploadSiteHostedPicturesRequest>`;

  const bodyBuffer = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="XML Payload"\r\nContent-Type: text/xml\r\n\r\n${xmlPayload}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="dummy"; filename="image.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`),
    imageBuffer,
    Buffer.from(`\r\n--${boundary}--\r\n`)
  ]);

  const res = await fetch('https://api.ebay.com/ws/api.dll', {
    method: 'POST',
    headers: {
      'X-EBAY-API-SITEID': '2',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '1451',
      'X-EBAY-API-CALL-NAME': 'UploadSiteHostedPictures',
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: bodyBuffer
  });

  const responseText = await res.text();
  
  const match = responseText.match(/<FullURL>(.*?)<\/FullURL>/);
  if (match && match[1]) {
    return match[1];
  }
  
  const errorMatch = responseText.match(/<ShortMessage>(.*?)<\/ShortMessage>/);
  throw new Error(errorMatch ? errorMatch[1] : 'Failed to upload image to eBay EPS');
}

export async function createEbayListing(token: string, data: any): Promise<string> {
  const { 
    title, 
    price, 
    description, 
    publisher, 
    issueNumber, 
    year,
    grade, 
    pictureUrls,
    categoryId = '259104', // Default: US Comics
    conditionId = '4000', // Default: Very Good
    returnsAccepted = 'ReturnsNotAccepted',
    shippingService = 'CA_PostLettermail',
    shippingCost = '5.00',
    currency = 'CAD',
    country = 'CA',
    site = 'Canada',
    siteId = '2',
    postalCode = 'M4B 1B3'
  } = data;
  
  const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<AddFixedPriceItemRequest xmlns="urn:ebay:apis:eBLBaseComponents">
  <RequesterCredentials>
    <eBayAuthToken>${escapeXml(token)}</eBayAuthToken>
  </RequesterCredentials>
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <Item>
    <Title>${escapeXml(String(title).substring(0, 80))}</Title>
    <Description><![CDATA[${(description || '').replace(/]]>/g, '')}]]></Description>
    <PrimaryCategory>
      <CategoryID>${escapeXml(categoryId)}</CategoryID>
    </PrimaryCategory>
    <StartPrice currencyID="${escapeXml(currency)}">${escapeXml(String(price))}</StartPrice>
    <ConditionID>${escapeXml(conditionId)}</ConditionID>
    <Country>${escapeXml(country)}</Country>
    <Currency>${escapeXml(currency)}</Currency>
    <DispatchTimeMax>3</DispatchTimeMax>
    <ListingDuration>GTC</ListingDuration>
    <ListingType>FixedPriceItem</ListingType>
    <PostalCode>${escapeXml(postalCode)}</PostalCode>
    <Quantity>1</Quantity>
    <ItemSpecifics>
      <NameValueList>
        <Name>Publisher</Name>
        <Value>${escapeXml(publisher || 'Unknown')}</Value>
      </NameValueList>
      <NameValueList>
        <Name>Issue Number</Name>
        <Value>${escapeXml(String(issueNumber || '1'))}</Value>
      </NameValueList>
      <NameValueList>
        <Name>Publication Year</Name>
        <Value>${escapeXml(String(year || 'Unknown'))}</Value>
      </NameValueList>
      <NameValueList>
        <Name>Format</Name>
        <Value>Single Issue</Value>
      </NameValueList>
      <NameValueList>
        <Name>Tradition</Name>
        <Value>US Comics</Value>
      </NameValueList>
      ${grade ? `
      <NameValueList>
        <Name>Grade</Name>
        <Value>${escapeXml(String(grade))}</Value>
      </NameValueList>` : ''}
    </ItemSpecifics>
    <PictureDetails>
      ${(pictureUrls || []).map((url: string) => `<PictureURL>${escapeXml(url)}</PictureURL>`).join('\n      ')}
    </PictureDetails>
    <ReturnPolicy>
      <ReturnsAcceptedOption>${escapeXml(returnsAccepted)}</ReturnsAcceptedOption>
    </ReturnPolicy>
    <ShippingDetails>
      <ShippingType>Flat</ShippingType>
      <ShippingServiceOptions>
        <ShippingService>${escapeXml(shippingService)}</ShippingService>
        <ShippingServiceCost currencyID="${escapeXml(currency)}">${escapeXml(String(shippingCost))}</ShippingServiceCost>
        <ShippingServiceAdditionalCost currencyID="${escapeXml(currency)}">0.00</ShippingServiceAdditionalCost>
        <ShippingServicePriority>1</ShippingServicePriority>
      </ShippingServiceOptions>
    </ShippingDetails>
    <ShipToLocations>${escapeXml(country)}</ShipToLocations>
    <Site>${escapeXml(site)}</Site>
  </Item>
</AddFixedPriceItemRequest>`;

  const res = await fetch('https://api.ebay.com/ws/api.dll', {
    method: 'POST',
    headers: {
      'X-EBAY-API-SITEID': siteId,
      'X-EBAY-API-COMPATIBILITY-LEVEL': '1451',
      'X-EBAY-API-CALL-NAME': 'AddFixedPriceItem',
      'Content-Type': 'text/xml'
    },
    body: xmlPayload
  });

  const responseText = await res.text();

  const ackMatch = responseText.match(/<Ack>(.*?)<\/Ack>/);
  if (ackMatch && (ackMatch[1] === 'Success' || ackMatch[1] === 'Warning')) {
    const itemIdMatch = responseText.match(/<ItemID>(.*?)<\/ItemID>/);
    return itemIdMatch ? itemIdMatch[1] : 'Unknown';
  }

  const unescapeXml = (s: string) =>
    s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&quot;/g, '"');

  // eBay error codes 21919218/21919219 = seller fee APM agreement not accepted
  const apmCodes = ['21919218', '21919219'];
  const errorCodeMatch = responseText.match(/<ErrorCode>(.*?)<\/ErrorCode>/);
  if (errorCodeMatch && apmCodes.includes(errorCodeMatch[1].trim())) {
    throw new Error(
      'eBay account is missing the seller billing agreement for Managed Payments. ' +
      'Fix: create a manual listing through eBay Seller Hub in your browser — eBay will present the agreement during that flow. ' +
      'Accept it, then try pushing again. If that fails, contact eBay support and ask them to "reset the seller billing agreement for API usage."'
    );
  }

  console.error("FULL EBAY API FAILURE RESPONSE:\n", responseText);

  // Extract only hard errors, ignoring warnings like "Funds on hold"
  const errorBlocks = responseText.match(/<Errors>[\s\S]*?<\/Errors>/g) || [];
  const hardErrors = errorBlocks.filter(b => b.includes('<SeverityCode>Error</SeverityCode>'));
  
  const allMessages = hardErrors.map(b => {
    const m = b.match(/<LongMessage>(.*?)<\/LongMessage>/);
    return m ? unescapeXml(m[1]) : '';
  }).filter(Boolean);

  const errorString = allMessages.length > 0 ? allMessages.join(" | ") : 'Failed to create eBay listing (Check Docker logs for full XML)';
  
  throw new Error(errorString);
}
