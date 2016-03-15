# Pysäkkinäyttö Fölin busseille

## Syntaksi

Osoitteeseen muodostetaan haku jonka perusteella aikataulutiedot haetaan.
Muoto on esimerkiksi `http://example.com/?stops=1,2&lines=3,4` (GET 
parametri) tai `http://example.com/?stops=1,2&lines=3,4` (fragment 
identifier).
 
Jos osoitteessa on molemmat muodot, vain fragment identifier -muodon
haku otetaan huomioon.

* **button** Ruudulla näytettävä nappi, muodossa 
    "Napin teksti|pysäkki:linja". Esimerkiksi "`Ikea|2125,2126`" 
    näyttäisi napin jossa lukee "Ikea", joka näyttäisi pysäkkien 2125 ja 
    2126 aikataulut. "`Töistä+kotiin|123:321`" Näyttäisi napin "Töistä 
    kotiin", joka näyttää bussit 321 pysäkiltä 123. Tämä parametri voi 
    esiintyä useaan otteeseen osoitteessa.
* **stops** Pysäkin koodi (esim "`T1`" tai "`2125`"), jonka aikataulut 
    haetaan. Useampi aikataulu haetaan kun niiden koodit erotellaan 
    pilkulla (esim "`T1,2125`").
    * Tässä voi myös antaa esiasetuksista seuraavat: `ikea`, 
    `kauppatori`, `lentoasema` tai `satama`.  
* **lines** Bussinumerot jotka tulee näyttää haetulta pysäkiltä.
* **firstrow**
* **lastrow**
* **pagerows**
* **pollinterval**
* **bundle**
* **maxforwardtime**
* **datakey**

## Selaintuki

Käytännössä kaikki modernit selaimet ovat tuettuja. Internet Explorerin
versio 11 on viimeisin tuettu; 10 ja aikaisemmat eivät tule toimimaan
oletetusti.

## Alkuperäinen versio

Tämä on putsattu forkki Fölin omasta pysäkkinäytöstä, joka löytyy 
osoitteesta http://192.103.112.236/Realtimehandler/. Lisätietoa myös 
[Fölin omilta sivuilta](http://www.foli.fi/fi/omien-pys%C3%A4kkien-reaaliaikaiset-aikataulut-n%C3%A4kyville-k%C3%A4tev%C3%A4sti)
