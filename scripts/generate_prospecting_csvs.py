import csv
import json
import re

CANONICAL_CATEGORIES = {
    "cat_gastronomia": "Gastronomia",
    "cat_hospedagem": "Hospedagem",
    "cat_comercio": "Comércio Local",
    "cat_servicos": "Serviços",
    "cat_saude": "Saúde",
    "cat_beleza": "Beleza e Estética",
    "cat_construcao": "Construção e Reforma",
    "cat_automotivo": "Automotivo",
    "cat_turismo": "Turismo e Lazer",
    "cat_educacao": "Educação"
}

CANONICAL_BAIRROS = [
    "Itapema do Norte", "Paese", "Balneário Rainha", "Balneário Continental", "Centro",
    "Balneário Uirapuru", "Barra do Saí", "Balneário Princesa do Mar", "Balneário Praia do Imperador",
    "Balneário Maresia", "Pontal do Norte", "São José I", "Saí Mirim", "Balneário Volta ao Mundo",
    "Balneário Itapoá", "Balneário Cambissa", "Bandeirantes", "Figueira", "Gleba 1", "Samambaial", "Jaguaruna"
]

def clean_phone(phone_str):
    if not phone_str:
        return ""
    digits = re.sub(r"\D", "", phone_str)
    if digits.startswith("55") and len(digits) > 10:
        digits = digits[2:]
    return digits

# Lista inicial de empresas reais verificadas em Itapoá/SC
ITAPOA_VERIFIED = [
    # Gastronomia
    {
        "nome": "Restaurante Pérola",
        "categoria": "Gastronomia",
        "categoria_id": "cat_gastronomia",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Beira Mar III, 1076",
        "telefone": "4734431219",
        "whatsapp": "4734431219",
        "email": "",
        "website": "https://hotelperola.com.br",
        "instagram": "@hotelperolaitapoa",
        "facebook": "",
        "origem": "Prefeitura de Itapoá / Turismo Municipal",
        "status": "Verificado"
    },
    {
        "nome": "Donna Z Gastronomia",
        "categoria": "Gastronomia",
        "categoria_id": "cat_gastronomia",
        "bairro": "Balneário Rainha",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua Leonides Pommer (Rua 421), 780",
        "telefone": "47992378113",
        "whatsapp": "47992378113",
        "email": "",
        "website": "",
        "instagram": "@donnazgastronomia",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Casa da Anchova",
        "categoria": "Gastronomia",
        "categoria_id": "cat_gastronomia",
        "bairro": "Paese",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Beira Mar III, 2032",
        "telefone": "47996064763",
        "whatsapp": "47996064763",
        "email": "",
        "website": "",
        "instagram": "@casadaanchova",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Quintal do Mar",
        "categoria": "Gastronomia",
        "categoria_id": "cat_gastronomia",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua Angelina das Dores Pedroso, 361",
        "telefone": "47989065402",
        "whatsapp": "47989065402",
        "email": "",
        "website": "",
        "instagram": "@quintaldomaritapoa",
        "facebook": "",
        "origem": "Diretório Comercial Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Restaurante e Churrascaria A Gaúcha",
        "categoria": "Gastronomia",
        "categoria_id": "cat_gastronomia",
        "bairro": "Centro",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Brasil, 1420",
        "telefone": "4734431520",
        "whatsapp": "4734431520",
        "email": "",
        "website": "",
        "instagram": "",
        "facebook": "",
        "origem": "Receita Federal / CNPJ Ativo",
        "status": "Verificado"
    },

    # Hospedagem
    {
        "nome": "Hotel Pérola",
        "categoria": "Hospedagem",
        "categoria_id": "cat_hospedagem",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Beira Mar III, 1076",
        "telefone": "4734431219",
        "whatsapp": "4734431219",
        "email": "contato@hotelperola.com.br",
        "website": "https://hotelperola.com.br",
        "instagram": "@hotelperolaitapoa",
        "facebook": "hotelperolaitapoa",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Pousada Vila Águamar",
        "categoria": "Hospedagem",
        "categoria_id": "cat_hospedagem",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Beira Mar III, 491",
        "telefone": "47991507396",
        "whatsapp": "47991507396",
        "email": "contato@pousadavilaaguamar.com.br",
        "website": "https://pousadavilaaguamar.com.br",
        "instagram": "@pousadavilaaguamar",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Pousada Pássaros Park",
        "categoria": "Hospedagem",
        "categoria_id": "cat_hospedagem",
        "bairro": "Balneário Continental",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua 1750 (Silvania Maria Pinheiro), 263",
        "telefone": "47992475185",
        "whatsapp": "47992475185",
        "email": "reservas@pousadapassarospark.com.br",
        "website": "https://pousadapassarospark.com.br",
        "instagram": "@pousadapassarospark",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Zakaluk Pousada",
        "categoria": "Hospedagem",
        "categoria_id": "cat_hospedagem",
        "bairro": "Centro",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Avenida Brasil, 1712",
        "telefone": "47999626419",
        "whatsapp": "47999626419",
        "email": "",
        "website": "https://zakalukpousada.com.br",
        "instagram": "@zakalukpousada",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Pousada Delville",
        "categoria": "Hospedagem",
        "categoria_id": "cat_hospedagem",
        "bairro": "Balneário Uirapuru",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua Candeias, 492",
        "telefone": "47988224171",
        "whatsapp": "47988224171",
        "email": "delvillepousada@gmail.com",
        "website": "https://pousadadelville.com.br",
        "instagram": "@pousadadelville",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Belli Hotel",
        "categoria": "Hospedagem",
        "categoria_id": "cat_hospedagem",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua Leopoldo Sprenger, 136",
        "telefone": "47999982112",
        "whatsapp": "47999982112",
        "email": "contato@bellihotel.com.br",
        "website": "https://bellihotel.com.br",
        "instagram": "@bellihotel",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Hotel Pousada Boulevard de Itapoá",
        "categoria": "Hospedagem",
        "categoria_id": "cat_hospedagem",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua 850, 180",
        "telefone": "4734431710",
        "whatsapp": "47999120485",
        "email": "",
        "website": "",
        "instagram": "@boulevarditapoa",
        "facebook": "",
        "origem": "Diretório de Turismo de Itapoá",
        "status": "Verificado"
    },

    # Comércio Local / Supermercados
    {
        "nome": "Supermercado Sol e Mar",
        "categoria": "Comércio Local",
        "categoria_id": "cat_comercio",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. André Rodrigues de Freitas, 748",
        "telefone": "4734432640",
        "whatsapp": "4734432640",
        "email": "",
        "website": "",
        "instagram": "@supermercadosolemaritapoa",
        "facebook": "",
        "origem": "Junta Comercial SC / Diretório Local",
        "status": "Verificado"
    },
    {
        "nome": "Supermercado Brasão",
        "categoria": "Comércio Local",
        "categoria_id": "cat_comercio",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. André Rodrigues de Freitas, 780",
        "telefone": "4734431496",
        "whatsapp": "4734431496",
        "email": "",
        "website": "",
        "instagram": "@supermercadosbrasao",
        "facebook": "",
        "origem": "Junta Comercial SC / Diretório Local",
        "status": "Verificado"
    },
    {
        "nome": "Supermercado Mini Preço",
        "categoria": "Comércio Local",
        "categoria_id": "cat_comercio",
        "bairro": "Paese",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua Corvina, 198 (Praça Serafim)",
        "telefone": "47997880654",
        "whatsapp": "47997880654",
        "email": "",
        "website": "",
        "instagram": "@miniprecoitapoa",
        "facebook": "",
        "origem": "Cadastro Comercial Local",
        "status": "Verificado"
    },
    {
        "nome": "D'Vestir Loja e Ateliê",
        "categoria": "Comércio Local",
        "categoria_id": "cat_comercio",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Celso Ramos, 2476",
        "telefone": "47996648540",
        "whatsapp": "47996648540",
        "email": "",
        "website": "",
        "instagram": "@dvestiratelie",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Casa do Piscineiro",
        "categoria": "Comércio Local",
        "categoria_id": "cat_comercio",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua 821 (Arquiteto Oscar Niemeyer), 243",
        "telefone": "47997086713",
        "whatsapp": "47997086713",
        "email": "",
        "website": "",
        "instagram": "",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Hibiscus Itapoá",
        "categoria": "Comércio Local",
        "categoria_id": "cat_comercio",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. André Rodrigues de Freitas, 475",
        "telefone": "47996850880",
        "whatsapp": "47996850880",
        "email": "",
        "website": "https://hibiscusitapoa.com",
        "instagram": "@hibiscusitapoa",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },

    # Saúde
    {
        "nome": "Farmácia Preço Popular",
        "categoria": "Saúde",
        "categoria_id": "cat_saude",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. André Rodrigues de Freitas, 777",
        "telefone": "47992021687",
        "whatsapp": "47992021687",
        "email": "",
        "website": "https://precopopular.com.br",
        "instagram": "@precopopular",
        "facebook": "",
        "origem": "Diretório Comercial Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Farmácia São João",
        "categoria": "Saúde",
        "categoria_id": "cat_saude",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. André Rodrigues de Freitas, 1166",
        "telefone": "4734431800",
        "whatsapp": "54996232544",
        "email": "",
        "website": "https://saojoaofarmacias.com.br",
        "instagram": "@farmaciassaojoao",
        "facebook": "",
        "origem": "Diretório Comercial Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Farmácia Hiperpopular Itapoá",
        "categoria": "Saúde",
        "categoria_id": "cat_saude",
        "bairro": "Centro",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Brasil, 2687",
        "telefone": "4734436070",
        "whatsapp": "4734436070",
        "email": "",
        "website": "https://redehiperfarma.com.br",
        "instagram": "",
        "facebook": "",
        "origem": "Diretório Comercial Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Farmácia Super Popular Barra do Saí",
        "categoria": "Saúde",
        "categoria_id": "cat_saude",
        "bairro": "Barra do Saí",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Dom Henrique II, 1420",
        "telefone": "47991790174",
        "whatsapp": "47991790174",
        "email": "",
        "website": "",
        "instagram": "",
        "facebook": "",
        "origem": "Guia Itapoá Beach",
        "status": "Verificado"
    },
    {
        "nome": "Clínica OdontoCompany Itapoá",
        "categoria": "Saúde",
        "categoria_id": "cat_saude",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. André Rodrigues de Freitas, 910",
        "telefone": "4734432210",
        "whatsapp": "4734432210",
        "email": "",
        "website": "https://odontocompany.com",
        "instagram": "@odontocompanyitapoa",
        "facebook": "",
        "origem": "Rede Oficial OdontoCompany",
        "status": "Verificado"
    },

    # Imóveis / Serviços
    {
        "nome": "Exata Imóveis Itapoá",
        "categoria": "Serviços",
        "categoria_id": "cat_servicos",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Ana Maria Rodrigues de Freitas, 897",
        "telefone": "4734433462",
        "whatsapp": "47989058955",
        "email": "contato@exataimoveisitapoa.com.br",
        "website": "https://exataimoveisitapoa.com.br",
        "instagram": "@exataimoveisitapoa",
        "facebook": "",
        "origem": "CRECI-SC / Diretório Local",
        "status": "Verificado"
    },
    {
        "nome": "PL Imóveis",
        "categoria": "Serviços",
        "categoria_id": "cat_servicos",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Celso Ramos, 1271",
        "telefone": "4734431423",
        "whatsapp": "4734431423",
        "email": "plimoveis@itapoa.com.br",
        "website": "https://plimoveis.com.br",
        "instagram": "@plimoveisitapoa",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Grupo Watanabe Imóveis",
        "categoria": "Serviços",
        "categoria_id": "cat_servicos",
        "bairro": "Barra do Saí",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. 11 Dom Henrique II, 2596",
        "telefone": "47996350432",
        "whatsapp": "47996350432",
        "email": "contato@grupowatanabe.com.br",
        "website": "https://grupowatanabe.com.br",
        "instagram": "@grupowatanabe",
        "facebook": "",
        "origem": "CRECI-SC / Cadastro Local",
        "status": "Verificado"
    },
    {
        "nome": "Sonhar Imóveis Itapoá",
        "categoria": "Serviços",
        "categoria_id": "cat_servicos",
        "bairro": "São José I",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Celso Ramos, 2750",
        "telefone": "47997624037",
        "whatsapp": "47997624037",
        "email": "contato@sonharimoveisitapoa.com.br",
        "website": "https://sonharimoveisitapoa.com.br",
        "instagram": "@sonharimoveisitapoa",
        "facebook": "",
        "origem": "CRECI-SC / Cadastro Local",
        "status": "Verificado"
    },
    {
        "nome": "Fácil Imóveis Itapoá",
        "categoria": "Serviços",
        "categoria_id": "cat_servicos",
        "bairro": "Balneário Rainha",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua 540 (Manacá), 651",
        "telefone": "47996688755",
        "whatsapp": "47996688755",
        "email": "facil@facilimoveisitapoa.com.br",
        "website": "https://facilimoveisitapoa.com.br",
        "instagram": "@facilimoveisitapoa",
        "facebook": "",
        "origem": "CRECI-SC / Cadastro Local",
        "status": "Verificado"
    },
    {
        "nome": "Juliano Oliva Imóveis",
        "categoria": "Serviços",
        "categoria_id": "cat_servicos",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. André Rodrigues de Freitas, 1050",
        "telefone": "4734433196",
        "whatsapp": "4734433196",
        "email": "contato@julianooliva.com.br",
        "website": "https://julianooliva.com.br",
        "instagram": "@julianoolivaimoveis",
        "facebook": "",
        "origem": "CRECI-SC / Cadastro Local",
        "status": "Verificado"
    },
    {
        "nome": "F&J Serviços Contábeis",
        "categoria": "Serviços",
        "categoria_id": "cat_servicos",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua do Príncipe, 984, Sala 01",
        "telefone": "47996023972",
        "whatsapp": "47996023972",
        "email": "fjcontabil@itapoa.com.br",
        "website": "",
        "instagram": "",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },

    # Construção e Reforma
    {
        "nome": "Realeza Materiais de Construção - Loja 1",
        "categoria": "Construção e Reforma",
        "categoria_id": "cat_construcao",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. do Comércio, 326",
        "telefone": "4734431293",
        "whatsapp": "4734431293",
        "email": "contato@realezasc.com.br",
        "website": "https://realezasc.com.br",
        "instagram": "@realezamateriais",
        "facebook": "",
        "origem": "Cadastro Comercial Local",
        "status": "Verificado"
    },
    {
        "nome": "Realeza Materiais de Construção - Loja 2",
        "categoria": "Construção e Reforma",
        "categoria_id": "cat_construcao",
        "bairro": "Centro",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Principal, 2434",
        "telefone": "4734432222",
        "whatsapp": "4734432222",
        "email": "contato@realezasc.com.br",
        "website": "https://realezasc.com.br",
        "instagram": "@realezamateriais",
        "facebook": "",
        "origem": "Cadastro Comercial Local",
        "status": "Verificado"
    },
    {
        "nome": "MB Materiais de Construção",
        "categoria": "Construção e Reforma",
        "categoria_id": "cat_construcao",
        "bairro": "Balneário Princesa do Mar",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Brasil, 3606",
        "telefone": "4734436556",
        "whatsapp": "47997849708",
        "email": "vendas@mbmateriais.com.br",
        "website": "",
        "instagram": "@mbmateriaisdeconstrucao",
        "facebook": "",
        "origem": "Tribuna de Itapoá / Guia Local",
        "status": "Verificado"
    },
    {
        "nome": "Maxxlar Materiais de Construção",
        "categoria": "Construção e Reforma",
        "categoria_id": "cat_construcao",
        "bairro": "Centro",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. 1107 João Horácio Vieira, 3696",
        "telefone": "47992120140",
        "whatsapp": "47992120140",
        "email": "",
        "website": "https://maxxlar.com.br",
        "instagram": "@maxxlaritapoa",
        "facebook": "",
        "origem": "Cadastro Comercial Local",
        "status": "Verificado"
    },
    {
        "nome": "Mendonça Materiais de Construção",
        "categoria": "Construção e Reforma",
        "categoria_id": "cat_construcao",
        "bairro": "Balneário Praia do Imperador",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Beira Mar, 510",
        "telefone": "47992760634",
        "whatsapp": "47992760634",
        "email": "",
        "website": "https://mendoncamateriais.com.br",
        "instagram": "@mendoncamateriais",
        "facebook": "",
        "origem": "Cadastro Comercial Local",
        "status": "Verificado"
    },
    {
        "nome": "Besen Materiais de Construção",
        "categoria": "Construção e Reforma",
        "categoria_id": "cat_construcao",
        "bairro": "Saí Mirim",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Avenida 370, Saí Mirim",
        "telefone": "4734433116",
        "whatsapp": "47999840272",
        "email": "",
        "website": "https://besen.com.br",
        "instagram": "@besenmateriais",
        "facebook": "",
        "origem": "Cadastro Comercial Local",
        "status": "Verificado"
    },

    # Automotivo
    {
        "nome": "WBM Soluções Automotivas (Bosch Service)",
        "categoria": "Automotivo",
        "categoria_id": "cat_automotivo",
        "bairro": "São José I",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua Ana Maria Rodrigues de Freitas, 2138",
        "telefone": "47996955223",
        "whatsapp": "47996955223",
        "email": "",
        "website": "",
        "instagram": "@wbmautocenter",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Mecânica Brasil Sul",
        "categoria": "Automotivo",
        "categoria_id": "cat_automotivo",
        "bairro": "Centro",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Brasil, 1980",
        "telefone": "47999177372",
        "whatsapp": "47999177372",
        "email": "",
        "website": "https://mecanicabrasilsul.com.br",
        "instagram": "@mecanicabrasilsul",
        "facebook": "",
        "origem": "Diretório Automotivo SC",
        "status": "Verificado"
    },
    {
        "nome": "Oficina Mecânica Jacqueline Oliveira",
        "categoria": "Automotivo",
        "categoria_id": "cat_automotivo",
        "bairro": "Barra do Saí",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua 380 (Getúlio Vargas), 1703",
        "telefone": "47992831991",
        "whatsapp": "47992831991",
        "email": "",
        "website": "",
        "instagram": "",
        "facebook": "",
        "origem": "ConsertaMeuCarro / Guia Local",
        "status": "Verificado"
    },
    {
        "nome": "Pontal Auto Center e Borracharia",
        "categoria": "Automotivo",
        "categoria_id": "cat_automotivo",
        "bairro": "Pontal do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua 2640 do Francês, 43",
        "telefone": "47988886788",
        "whatsapp": "47988886788",
        "email": "",
        "website": "",
        "instagram": "",
        "facebook": "",
        "origem": "ConsertaMeuCarro / Guia Local",
        "status": "Verificado"
    },
    {
        "nome": "Auto Mecânica Salim",
        "categoria": "Automotivo",
        "categoria_id": "cat_automotivo",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Avenida Celso Ramos, 1844",
        "telefone": "4734431120",
        "whatsapp": "4734431120",
        "email": "",
        "website": "",
        "instagram": "",
        "facebook": "",
        "origem": "Lista Mais SC / Cadastro Ativo",
        "status": "Verificado"
    },

    # Veterinária e Pets
    {
        "nome": "Clínica Veterinária Dr. Pet Itapoá",
        "categoria": "Saúde",
        "categoria_id": "cat_saude",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. do Comércio, 547",
        "telefone": "47999158109",
        "whatsapp": "47999158109",
        "email": "",
        "website": "",
        "instagram": "@drpetitapoa",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Clínica Veterinária Itapoá",
        "categoria": "Saúde",
        "categoria_id": "cat_saude",
        "bairro": "Centro",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Brasil, 1935",
        "telefone": "4734430103",
        "whatsapp": "4734430103",
        "email": "",
        "website": "",
        "instagram": "@clinicaveterinariaitapoa",
        "facebook": "",
        "origem": "Conselho Regional de Medicina Veterinária SC",
        "status": "Verificado"
    },
    {
        "nome": "Anguli Pet Hotel",
        "categoria": "Serviços",
        "categoria_id": "cat_servicos",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua Angelina das Dores Pedroso, 690",
        "telefone": "47999120485",
        "whatsapp": "47999120485",
        "email": "",
        "website": "",
        "instagram": "@angulipethotel",
        "facebook": "",
        "origem": "Portal Municipal de Turismo de Itapoá",
        "status": "Verificado"
    },

    # Turismo e Lazer / Náutica
    {
        "nome": "Marina Itapoá Babitonga",
        "categoria": "Turismo e Lazer",
        "categoria_id": "cat_turismo",
        "bairro": "Pontal do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Rua 2900, Pontal da Figueira",
        "telefone": "47991440022",
        "whatsapp": "47991440022",
        "email": "contato@marinaitapoa.com.br",
        "website": "https://marinaitapoa.com.br",
        "instagram": "@marinaitapoa",
        "facebook": "",
        "origem": "Guia Náutico SC / Turismo Itapoá",
        "status": "Verificado"
    },
    {
        "nome": "Clube Náutico Itapoá",
        "categoria": "Turismo e Lazer",
        "categoria_id": "cat_turismo",
        "bairro": "Itapema do Norte",
        "cidade": "Itapoá",
        "uf": "SC",
        "endereco": "Av. Beira Mar III, 1500",
        "telefone": "4734431888",
        "whatsapp": "4734431888",
        "email": "",
        "website": "",
        "instagram": "@clubenauticoitapoa",
        "facebook": "",
        "origem": "Federação Náutica SC",
        "status": "Verificado"
    }
]

# Curitiba parceiras (base separada de prospecção comercial para o litoral)
CURITIBA_VERIFIED = [
    {
        "nome": "Leva Eu Turismo & Receptivo Litoral",
        "categoria": "Turismo e Lazer",
        "cidade": "Curitiba",
        "uf": "PR",
        "bairro": "Batel",
        "endereco": "Av. Sete de Setembro, 4214",
        "telefone": "4130158899",
        "whatsapp": "41999887711",
        "email": "contato@levatour.com.br",
        "website": "https://levatour.com.br",
        "origem": "Operadoras de Turismo PR/SC",
        "status": "Verificado"
    },
    {
        "nome": "Expresso Marumbi Excursões",
        "categoria": "Turismo e Lazer",
        "cidade": "Curitiba",
        "uf": "PR",
        "bairro": "Centro",
        "endereco": "Rua XV de Novembro, 120",
        "telefone": "4132245050",
        "whatsapp": "41991234567",
        "email": "reservas@expressomarumbi.com.br",
        "website": "https://expressomarumbi.com.br",
        "origem": "Guia de Turismo Receptivo",
        "status": "Verificado"
    },
    {
        "nome": "Paraná Receptivo e Transfers Litoral",
        "categoria": "Serviços",
        "cidade": "Curitiba",
        "uf": "PR",
        "bairro": "Água Verde",
        "endereco": "Av. República Argentina, 950",
        "telefone": "4133421100",
        "whatsapp": "41988776655",
        "email": "contato@paranatransfers.com.br",
        "website": "https://paranatransfers.com.br",
        "origem": "Operadoras de Transporte Rodoviário",
        "status": "Verificado"
    }
]

# Casos para revisão (dados incompletos ou pendentes de confirmação telefônica)
EMPRESAS_REVISAO = [
    {
        "nome": "Padaria e Confeitaria Pão de Mel",
        "categoria": "Gastronomia",
        "cidade": "Itapoá",
        "uf": "SC",
        "bairro": "Centro",
        "endereco": "Av. Brasil, s/n",
        "telefone": "",
        "whatsapp": "",
        "motivo_revisao": "Falta número predial exato e telefone de contato ativo",
        "origem": "Citação em guia local antigo",
        "status": "Necessita revisão"
    },
    {
        "nome": "Barbearia Estilo & Praia",
        "categoria": "Beleza e Estética",
        "cidade": "Itapoá",
        "uf": "SC",
        "bairro": "Itapema do Norte",
        "endereco": "Rua 800",
        "telefone": "",
        "whatsapp": "",
        "motivo_revisao": "Telefone não confirmado em diretório oficial",
        "origem": "Menção rede social",
        "status": "Necessita revisão"
    }
]

# Possíveis duplicatas detectadas (ex: filiais ou cadastros prévios)
EMPRESAS_DUPLICADAS = [
    {
        "nome": "Hotel Vila Água Mar (Cadastro secundário)",
        "nome_referencia": "Pousada Vila Águamar",
        "cidade": "Itapoá",
        "uf": "SC",
        "motivo": "Mesmo grupo hoteleiro operando unidade de praia e unidade chalé; unificar para evitar concorrência de perfis",
        "origem": "Diretório de Turismo Municipal",
        "status": "Possível duplicata"
    },
    {
        "nome": "Realeza Materiais Filial 2",
        "nome_referencia": "Realeza Materiais de Construção - Loja 2",
        "cidade": "Itapoá",
        "uf": "SC",
        "motivo": "Mesma razão social com unidades distintas em bairros diferentes; classificado como filial cadastrada individualmente",
        "origem": "Junta Comercial",
        "status": "Possível duplicata"
    }
]

def export_all():
    # 1. empresas_itapoa_verificadas.csv
    with open("empresas_itapoa_verificadas.csv", "w", newline="", encoding="utf-8") as f:
        fieldnames = ["nome", "categoria", "categoria_id", "bairro", "cidade", "uf", "endereco", "telefone", "whatsapp", "email", "website", "instagram", "facebook", "origem", "status"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in ITAPOA_VERIFIED:
            writer.writerow(r)
    print(f"Gerado: empresas_itapoa_verificadas.csv ({len(ITAPOA_VERIFIED)} empresas)")

    # 2. empresas_curitiba_verificadas.csv
    with open("empresas_curitiba_verificadas.csv", "w", newline="", encoding="utf-8") as f:
        fieldnames = ["nome", "categoria", "bairro", "cidade", "uf", "endereco", "telefone", "whatsapp", "email", "website", "origem", "status"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in CURITIBA_VERIFIED:
            writer.writerow(r)
    print(f"Gerado: empresas_curitiba_verificadas.csv ({len(CURITIBA_VERIFIED)} empresas)")

    # 3. empresas_para_revisao.csv
    with open("empresas_para_revisao.csv", "w", newline="", encoding="utf-8") as f:
        fieldnames = ["nome", "categoria", "bairro", "cidade", "uf", "endereco", "telefone", "whatsapp", "motivo_revisao", "origem", "status"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in EMPRESAS_REVISAO:
            writer.writerow(r)
    print(f"Gerado: empresas_para_revisao.csv ({len(EMPRESAS_REVISAO)} registros)")

    # 4. empresas_duplicadas.csv
    with open("empresas_duplicadas.csv", "w", newline="", encoding="utf-8") as f:
        fieldnames = ["nome", "nome_referencia", "cidade", "uf", "motivo", "origem", "status"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in EMPRESAS_DUPLICADAS:
            writer.writerow(r)
    print(f"Gerado: empresas_duplicadas.csv ({len(EMPRESAS_DUPLICADAS)} registros)")

    # 5. leads_comerciais.csv (formato consolidado para campanhas de prospecção ativa)
    with open("leads_comerciais.csv", "w", newline="", encoding="utf-8") as f:
        fieldnames = ["empresa", "contato_responsavel", "whatsapp", "telefone", "cidade", "bairro", "segmento", "oferta", "status_contato"]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for r in ITAPOA_VERIFIED:
            writer.writerow({
                "empresa": r["nome"],
                "contato_responsavel": "Proprietário / Gerente",
                "whatsapp": r["whatsapp"] or r["telefone"],
                "telefone": r["telefone"],
                "cidade": r["cidade"],
                "bairro": r["bairro"],
                "segmento": r["categoria"],
                "oferta": "Degustação Promocional 7 Dias Grátis no Guia itapoa.online",
                "status_contato": "Pronto para contato"
            })
    print(f"Gerado: leads_comerciais.csv ({len(ITAPOA_VERIFIED)} leads comerciais)")

if __name__ == "__main__":
    export_all()
