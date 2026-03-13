package com.fernandoarmengol.ggwp.ui.fragments

import android.annotation.SuppressLint
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.widget.addTextChangedListener
import androidx.fragment.app.Fragment
import androidx.recyclerview.widget.GridLayoutManager
import com.fernandoarmengol.ggwp.GlobalVar.Companion.championSummaryCD
import com.fernandoarmengol.ggwp.R
import com.fernandoarmengol.ggwp.databinding.FragmentChampionsBinding
import com.fernandoarmengol.ggwp.model.ChampPositionsNodeJS
import com.fernandoarmengol.ggwp.model.ChampionSummaryCD
import com.fernandoarmengol.ggwp.network.APIService
import com.fernandoarmengol.ggwp.dialogs.NetworkError.dialogNetworkError
import com.fernandoarmengol.ggwp.network.RetrofitHelper.getRetrofitComunityDragon
import com.fernandoarmengol.ggwp.network.RetrofitHelper.getRetrofitNodeJS
import com.fernandoarmengol.ggwp.ui.adapters.RVChampionsAdapter
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ChampionsFragment : Fragment() {

    private lateinit var binding: FragmentChampionsBinding
    private val adapter: RVChampionsAdapter = RVChampionsAdapter()

    private var champions: MutableList<ChampionSummaryCD> = ArrayList()

    //Varibles Buscador
    private var searchedChamps: MutableList<ChampionSummaryCD> = ArrayList()

    //Variables Filtros
    private var championsPositions: MutableList<ChampPositionsNodeJS> = ArrayList()
    private var roleFilter = "all"

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        binding = FragmentChampionsBinding.inflate(inflater, container, false)
        val view = binding.root

        binding.entryName.addTextChangedListener {
            filtrar()
        }
        binding.toggleButtonGroup.addOnButtonCheckedListener { toggleButtonGroup, checkedId, isChecked ->
            if (isChecked) {
                when (checkedId) {
                    binding.btnTop.id -> roleFilter = "top"
                    binding.btnJg.id -> roleFilter = "jg"
                    binding.btnMid.id -> roleFilter = "mid"
                    binding.btnBot.id -> roleFilter = "bot"
                    binding.btnSup.id -> roleFilter = "supp"
                }
            } else {
                if (toggleButtonGroup.checkedButtonId == View.NO_ID) {
                    roleFilter = "all"
                }
            }
            filtrar()
        }

        //Cargar datos
        loadData()

        return view
    }

    //Descargar datos del Comunity Dragon y del proyecto NodeJS
    private fun loadData(){
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val callChampPosition = getRetrofitNodeJS().create(APIService::class.java).getRolesNodeJS()
                if (callChampPosition.isSuccessful) {
                    activity?.runOnUiThread {
                        champions = championSummaryCD.toMutableList()
                        championsPositions = (callChampPosition.body() as MutableList<ChampPositionsNodeJS>?)!!
                        champions.removeAt(0)
                        champions.sortBy { it.name }
                        searchedChamps = champions.toMutableList()

                        binding.progressBar.visibility = View.GONE
                        binding.layout.visibility = View.VISIBLE

                        setUpRecyclerView()
                    }
                }
            }
            catch (e: Exception){
                activity?.runOnUiThread {
                    dialogNetworkError(requireContext().applicationContext, getString(R.string.network_error))
                }
            }
        }
    }

    // Método encargado de configurar el RV.
    private fun setUpRecyclerView() {
        binding.rvChampions.setHasFixedSize(true)
        binding.rvChampions.layoutManager =
            GridLayoutManager(requireContext().applicationContext, 4)
        adapter.RecyclerAdapter(searchedChamps, requireContext().applicationContext)
        binding.rvChampions.adapter = adapter
    }

    @SuppressLint("NotifyDataSetChanged")
    private fun filtrar() {
        searchedChamps.clear()
        for (champ in champions) {
            if (champ.name.contains(binding.entryName.text, ignoreCase = true) && (roleFilter == "all" || (championsPositions.find { it.value == champ.id }?.positions?.contains(roleFilter)!!))) {
                searchedChamps.add(champ)
            }
        }
        adapter.notifyDataSetChanged()
    }
}
