package com.fernandoarmengol.ggwp.network

import com.fernandoarmengol.ggwp.model.*
import com.fernandoarmengol.ggwp.model.champ_cd.ChampCD
import com.fernandoarmengol.ggwp.model.champ_stadistics_nodejs.ChampStadisticsNodeJS
import com.fernandoarmengol.ggwp.model.match_nodejs.MatchNodeJS
import com.fernandoarmengol.ggwp.model.perk_styles_cd.PerkStyleCD
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Url

interface APIService {
    @GET
    suspend fun getChampionStats(@Url url:String): Response<ChampStadisticsNodeJS>

    @GET("roles/")
    suspend fun getRolesNodeJS(): Response<List<ChampPositionsNodeJS>>

    @GET
    suspend fun getChampCD(@Url url:String): Response<ChampCD>

    @GET("champion-summary.json")
    suspend fun getChampSumaryCD(): Response<List<ChampionSummaryCD>>

    @GET("items.json")
    suspend fun getItemsCD(): Response<List<ItemsCD>>

    @GET("summoner-spells.json")
    suspend fun getSpellsCD(): Response<List<SpellsCD>>

    @GET("perkstyles.json")
    suspend fun getPerkStylesCD(): Response<PerkStyleCD>

    @GET("perks.json")
    suspend fun getPerksCD(): Response<List<PerksCD>>

    @GET
    suspend fun getSummonerNodeJS(@Url url:String): Response<SummonerNodeJS>

    @GET
    suspend fun getMatchNodeJS(@Url url:String): Response<MatchNodeJS>

    @GET
    suspend fun getMasteriesNodeJS(@Url url:String): Response<List<MaestriesNodeJS>>

    @GET
    suspend fun getEloNodeJS(@Url url:String): Response<List<EloNodeJS>>
}
