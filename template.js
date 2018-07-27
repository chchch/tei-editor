const tei_template = 
`<?xml-model href="tei_all.rng" schematypens="http://relaxng.org/ns/structure/1.0"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
<teiHeader>
  <fileDesc>
    <titleStmt>
      <title></title> 
    </titleStmt>
    <publicationStmt>
      <distributor></distributor> <!-- required -->
    </publicationStmt>
    <sourceDesc>
      <msDesc>
        <msIdentifier>
          <placeName>
            <settlement></settlement><!-- required -->
            <region></region>
            <country></country>
            <geo></geo>
          </placeName>
          <repository ref=""></repository> <!-- required -->
          <idno></idno> <!-- required -->
        </msIdentifier>
        <msContents>
          <summary></summary> <!-- optional -->
          <msItem>
            <title ref=""></title> <!-- required -->
            <author ref=""></author> <!-- required -->
            <textLang mainLang="san" otherLangs=""></textLang><!-- @mainLang required -->
          </msItem>
        </msContents>
        <physDesc>
          <objectDesc>
            <supportDesc material="paper">
              <extent>
                <measure quantity="" unit="folios"/> <!-- required -->
                <dimensions type="leaf" unit="cm"> <!-- optional -->
                  <height></height>
                  <width></width>
                </dimensions>
              </extent>
              <foliation></foliation><!-- optional -->
              <condition><!-- required -->
                <ab></ab><!-- either "Complete." or "Incomplete." -->
                <p></p><!-- Optional user input -->
              </condition>
            </supportDesc>
            <layoutDesc>
              <summary></summary> <!-- optional -->
              <layout writtenLines=""/> <!-- @writtenLines required -->
            </layoutDesc>
          </objectDesc>
          <handDesc>
            <summary></summary> <!-- optional -->
            <handNote scope="sole" script="devanagari" scribe=""></handNote> <!-- @script required, @scribe optional -->
          </handDesc>
          <additions></additions> <!-- TODO: Work this out (optional) -->
        </physDesc>
        <history>
          <origin>
            <origPlace></origPlace> <!-- optional -->
            <origDate calendar="VS" when-iso=""></origDate> <!-- @when-iso optional, text required -->
          </origin>
          <provenance></provenance> <!-- optional -->
        </history>
      </msDesc>
    </sourceDesc>
  </fileDesc>
</teiHeader>
<text>
  <body>

<pb n="1r"/>
  <lb n="1"/>
  <lb n="2"/>
  <lb n="3"/>
  <lb n="4"/>
  <lb n="5"/>

  </body>
</text>
</TEI>`;
